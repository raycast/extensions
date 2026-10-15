const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  },
]);
