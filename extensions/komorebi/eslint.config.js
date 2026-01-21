const { defineConfig } = require("eslint/config");
const eslintConfig = require("@raycast/eslint-config");

module.exports = defineConfig([...eslintConfig]);
