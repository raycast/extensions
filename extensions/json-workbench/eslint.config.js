const raycast = require("@raycast/eslint-config");
const { defineConfig } = require("eslint/config");
const globals = require("globals");
module.exports = defineConfig([...raycast, { files: ["editor/**/*.ts"], languageOptions: { globals: globals.browser } }]);
