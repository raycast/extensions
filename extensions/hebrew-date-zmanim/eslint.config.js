const raycastConfig = require("@raycast/eslint-config");

// Flatten the config array to handle nested arrays
function flattenConfig(config) {
  const result = [];
  for (const item of config) {
    if (Array.isArray(item)) {
      result.push(...flattenConfig(item));
    } else {
      result.push(item);
    }
  }
  return result;
}

module.exports = flattenConfig(raycastConfig);
