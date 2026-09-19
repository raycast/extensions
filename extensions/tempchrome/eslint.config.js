const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([{ ignores: ["dist/", "raycast-env.d.ts"] }, ...raycastConfig]);
