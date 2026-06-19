const { defineConfig } = require("eslint/config");
const raycast = require("@raycast/eslint-config");

// defineConfig flattens nested config arrays automatically, so @raycast/eslint-config's
// nested element (which plain ESLint 9 flat config would reject) works without `.flat()`.
module.exports = defineConfig([
  { ignores: ["dist/**", "node_modules/**", "raycast-env.d.ts"] },
  ...raycast,
]);
