const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

// defineConfig() flattens the nested config arrays that @raycast/eslint-config ships.
module.exports = defineConfig([
  ...raycastConfig,
  { ignores: ["dist/**", "node_modules/**", "raycast-env.d.ts"] },
]);
