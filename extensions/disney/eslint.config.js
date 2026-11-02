const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    files: ["tests/**/*.cjs", "eslint.config.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);
