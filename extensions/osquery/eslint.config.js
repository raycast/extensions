const raycastConfig = require("@raycast/eslint-config");

// Flatten in case of nested arrays
module.exports = raycastConfig.flat ? raycastConfig.flat(Infinity) : raycastConfig;
