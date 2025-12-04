const raycastConfig = require("@raycast/eslint-config");

// Flatten the config to handle nested arrays
const flattenedConfig = raycastConfig.flat ? raycastConfig.flat() : raycastConfig.reduce((acc, item) => {
  if (Array.isArray(item)) {
    acc.push(...item);
  } else {
    acc.push(item);
  }
  return acc;
}, []);

module.exports = [
  ...flattenedConfig,
  {
    ignores: ["src/libs/node-spotlight/**/*.md"]
  }
]; 