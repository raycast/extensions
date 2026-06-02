const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    // Rozszerzenie jest polskojęzyczne — Title Case dotyczy tytułów angielskich
    rules: {
      "@raycast/prefer-title-case": "off",
    },
  },
]);
