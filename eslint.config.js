const raycastConfig = require("@raycast/eslint-config");

// Flatten the config array (ESLint 9 doesn't support nested arrays)
module.exports = raycastConfig.flat();

