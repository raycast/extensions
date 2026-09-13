const raycastConfig = require("@raycast/eslint-config");

module.exports = [
  { ignores: ["dist/**", "node_modules/**"] },
  ...raycastConfig,
];
