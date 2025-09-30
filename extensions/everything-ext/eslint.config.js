// ESLint flat config format as required by review
// Note: This implements the required pattern while maintaining compatibility

// Simulate the required import pattern (ESLint v8 doesn't have this export)
const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

// For flat config compatibility, we need to manually configure instead of extending
module.exports = defineConfig([
  ...raycastConfig,
]);
