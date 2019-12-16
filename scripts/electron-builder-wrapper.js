/**
 * @overview This script runs `electron-builder` with special management of code signing configuration on Windows.
 * Running this script with no command line parameters should build all targets for the current platform.
 * On Windows, make sure to set CSC_* or WIN_CSC_* environment variables or the NSIS build will fail.
 * On Mac, the CSC_* variables are optional but will be respected if present.
 * See also: https://www.electron.build/code-signing
 */

const {spawnSync} = require('child_process');

/**
 * Strip any code signing configuration (CSC) from a set of environment variables.
 * @param {object} environment - a collection of environment variables which might include code signing configuration.
 * @returns {object} - a collection of environment variables which does not include code signing configuration.
 */
const stripCSC = function (environment) {
    const {
        CSC_LINK: _CSC_LINK,
        CSC_KEY_PASSWORD: _CSC_KEY_PASSWORD,
        WIN_CSC_LINK: _WIN_CSC_LINK,
        WIN_CSC_KEY_PASSWORD: _WIN_CSC_KEY_PASSWORD,
        ...strippedEnvironment
    } = environment;
    return strippedEnvironment;
};

/**
 * @returns {string} - an `electron-builder` flag to build for the current platform, based on `process.platform`.
 */
const getPlatformFlag = function () {
    return '--windows';
    switch (process.platform) {
    case 'win32': return '--windows';
    case 'darwin': return '--macos';
    case 'linux': return '--linux';
    }
    throw new Error(`Could not determine platform flag for platform: ${process.platform}`);
};

/**
 * Run `electron-builder` once to build one or more target(s).
 * @param {string} targetGroup - the target(s) to build in this pass.
 * If the `targetGroup` is `'nsis'` then the environment must contain code-signing config (CSC_* or WIN_CSC_*).
 * If the `targetGroup` is `'appx'` then code-signing config will be stripped from the environment if present.
 */
const runBuilder = function (targetGroup) {
    // the appx build fails if CSC_* or WIN_CSC_* variables are set
    const shouldStripCSC = (targetGroup === 'appx');
    const childEnvironment = shouldStripCSC ? stripCSC(process.env) : process.env;
//    if ((targetGroup === 'nsis') && !(childEnvironment.CSC_LINK || childEnvironment.WIN_CSC_LINK)) {
//        throw new Error(`NSIS build requires CSC_LINK or WIN_CSC_LINK`);
//    }
    const platformFlag = getPlatformFlag();
    const command = `electron-builder ${platformFlag} ${targetGroup}`;
    console.log(`running: ${command}`);
    spawnSync(command, {
        env: childEnvironment,
        shell: true,
        stdio: 'inherit'
    });
};

/**
 * @returns {Array.<string>} - the default list of target groups on this platform. Each item in the array represents
 * one call to `runBuilder` for one or more build target(s).
 */
const calculateTargets = function () {
    return ['nsis', 'appx'];
    switch (process.platform) {
    case 'win32':
        // run in two passes so we can skip signing the appx
        return ['nsis', 'appx'];
    case 'darwin':
        // run in one pass for slightly better speed
        return ['dmg mas'];
    }
    throw new Error(`Could not determine targets for platform: ${process.platform}`);
};

// TODO: allow user to specify targets? We could theoretically build NSIS on Mac, for example.
const targets = calculateTargets();
for (const targetGroup of targets) {
    runBuilder(targetGroup);
}
