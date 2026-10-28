const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  {
    ignores: ["node_modules/**", "dist/**", ".raycast-build/**", "raycast-env.d.ts", "eslint.config.js"],
  },
  ...raycastConfig,
]);
