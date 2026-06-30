const { defineConfig } = require("eslint/config");
const raycast = require("@raycast/eslint-config");

module.exports = defineConfig([
  {
    ignores: ["eslint.config.js", "raycast-env.d.ts"],
  },
  raycast,
]);
