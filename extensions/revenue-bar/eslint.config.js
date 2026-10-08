const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  { ignores: ["dist/**"] },
  {
    // Arguments that only key a cache (useCachedPromise) are prefixed with "_".
    rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }] },
  },
]);
