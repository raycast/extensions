const raycastConfig = require("@raycast/eslint-config");

// Flatten any nested arrays in the config
const flattenConfig = (config) => {
  return config.reduce((acc, item) => {
    if (Array.isArray(item)) {
      acc.push(...flattenConfig(item));
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
};

module.exports = flattenConfig(raycastConfig);
