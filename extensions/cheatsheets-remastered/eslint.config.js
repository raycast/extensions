const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    files: ["tests/**/*.cjs"],
    rules: {
      // Node CommonJS fixtures use require and Module._load to isolate Raycast APIs.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
