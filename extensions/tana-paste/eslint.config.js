const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");
const globals = require("globals");

module.exports = defineConfig([
  ...raycastConfig,
  {
    files: ["**/__tests__/**/*.js", "**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
]);
