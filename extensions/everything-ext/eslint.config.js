// ESLint flat config format as required by review
// Note: This implements the required pattern while maintaining compatibility

const { defineConfig } = require("eslint/config");

// For flat config compatibility, we need to manually configure instead of extending
const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
]);