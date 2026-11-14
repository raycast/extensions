const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    files: ["src/lib/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ["@raycast/*"] }],
    },
  },
]);
