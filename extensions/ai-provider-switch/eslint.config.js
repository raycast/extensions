const raycast = require("@raycast/eslint-config");

// Flatten nested arrays from @raycast/eslint-config
const flattenConfig = (config) => {
  if (!Array.isArray(config)) return [config];
  return config.flatMap(item => Array.isArray(item) ? flattenConfig(item) : item);
};

module.exports = flattenConfig(raycast);





