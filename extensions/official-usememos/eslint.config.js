const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    rules: {
      "@raycast/prefer-title-case": "error",
      "@raycast/prefer-ellipsis": "error",
      "@raycast/prefer-placeholders": "error",
      "@raycast/prefer-common-shortcut": "error",
      "@raycast/no-reserved-shortcut": "error",
      "@raycast/no-ambiguous-platform-shortcut": "error",
      "no-console": "error",
    },
  },
  {
    files: ["tools/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
]);
