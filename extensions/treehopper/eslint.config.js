const raycastConfig = require("@raycast/eslint-config");

// Flatten nested arrays (workaround for ESLint 9 compatibility)
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
