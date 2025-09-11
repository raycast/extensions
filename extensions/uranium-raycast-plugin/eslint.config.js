const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    rules: {
      // Allow 'any' types with warning instead of error
      "@typescript-eslint/no-explicit-any": "off",

      // Allow unused vars that start with underscore (common pattern for TODO params)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_"
        }
      ],

      // Allow unused parameters that start with underscore
      "no-unused-vars": "off", // Turn off base rule as it conflicts with TypeScript rule
    },
  },
]);
