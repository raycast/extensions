const { defineConfig, globalIgnores } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([globalIgnores(["dist/", "raycast-env.d.ts", "eslint.config.js"]), ...raycastConfig]);
