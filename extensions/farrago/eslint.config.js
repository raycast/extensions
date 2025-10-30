// eslint-disable-next-line
const { defineConfig } = require("eslint/config");
// eslint-disable-next-line
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
