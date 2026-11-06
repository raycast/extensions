const { defineConfig } = require("eslint/config");
const raycast = require("@raycast/eslint-config");
module.exports = defineConfig([{ ignores: ["assets/*.js"] }, ...raycast]);
