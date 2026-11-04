const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  {
    ignores: ["raycast-env.d.ts", "dist/**", "node_modules/**"],
  },
  ...raycastConfig,
  {
    files: ["eslint.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
