const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    files: ["src/**/*.jsx"],
    // You can add specific rules or overrides here if needed
  },
]);
