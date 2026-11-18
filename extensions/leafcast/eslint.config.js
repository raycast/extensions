const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  { ignores: ["eslint.config.js", "raycast-env.d.ts"] },
  ...require("@raycast/eslint-config").flat(),
]);
