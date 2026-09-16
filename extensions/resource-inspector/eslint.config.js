const { defineConfig } = require("eslint/config");
const raycast = require("@raycast/eslint-config");
module.exports = defineConfig([
  ...raycast,
  { ignores: ["dist/**", "raycast-env.d.ts"] },
]);
