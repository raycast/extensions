const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    ignores: ["dist/**", "node_modules/**", "raycast-env.d.ts", "assets/langcodes.json"],
  },
]);
