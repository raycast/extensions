const { defineConfig } = require("@eslint/config-helpers");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
]);
