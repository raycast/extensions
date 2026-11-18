const { defineConfig } = require("eslint/config");
const config = require("@raycast/eslint-config");

module.exports = defineConfig([...config.flat(Infinity)]);
