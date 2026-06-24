const raycastConfig = require("@raycast/eslint-config");

module.exports = Array.isArray(raycastConfig) ? raycastConfig.flat() : [raycastConfig];
