/* eslint-disable @typescript-eslint/no-require-imports */
const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    ignores: ["**/dist/**", ".local/**", "raycast-env.d.ts"],
  },
]);
