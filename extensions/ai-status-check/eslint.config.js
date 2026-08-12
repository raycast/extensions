const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([{ ignores: ["dist/**", "eslint.config.js"] }, ...raycastConfig]);
