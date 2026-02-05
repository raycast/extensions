const raycastConfig = require("@raycast/eslint-config");

// Flatten nested arrays from the config
module.exports = raycastConfig.flat(Infinity);
