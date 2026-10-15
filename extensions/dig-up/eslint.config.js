const { defineConfig, globalIgnores } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  globalIgnores(["test/fixtures/**", ".testbed/**", ".vendor/**", "assets/**", "dist/**", "docs/**"]),
  ...raycastConfig,
]);
