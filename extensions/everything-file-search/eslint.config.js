const raycast = require("@raycast/eslint-config");
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  ...raycast,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
]);
