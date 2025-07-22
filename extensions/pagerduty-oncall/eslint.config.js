const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    rules: {
      // Disable TypeScript rules that strip generic types
      "@typescript-eslint/no-unnecessary-type-arguments": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      // Disable rules that might affect generic syntax
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-empty-interface": "off",
    },
  },
]);
