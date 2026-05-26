const raycastConfig = require("@raycast/eslint-config");

module.exports = [
  ...raycastConfig.flat(),
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
