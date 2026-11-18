const eslintConfig = require("@raycast/eslint-config");

// Flatten the config array to handle nested arrays (e.g. raycast.configs.recommended)
module.exports = eslintConfig.flat();
