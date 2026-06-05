const raycastConfig = require("@raycast/eslint-config");

module.exports = [
  ...raycastConfig.flat(),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];
