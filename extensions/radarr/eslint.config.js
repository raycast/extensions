const raycastConfig = require("@raycast/eslint-config");

// Flatten the config array to handle nested arrays
function flattenConfig(config) {
  return config.flatMap((item) => (Array.isArray(item) ? item : [item]));
}

module.exports = flattenConfig(raycastConfig);
