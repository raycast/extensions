const { defineConfig } = require("@eslint/js");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
]);
