const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([{ ignores: ["eslint.config.js", "raycast-env.d.ts"] }, ...raycastConfig]);
