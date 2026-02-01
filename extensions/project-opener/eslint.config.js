const raycastConfig = require("@raycast/eslint-config");

// Flatten any nested arrays (ESLint 9.39+ is strict about this)
module.exports = raycastConfig.flat();
