// eslint.config.js — ESLint 9 flat config for the Raycast extension.
// Uses @raycast/eslint-config which provides the recommended preset
// including TypeScript, React, and Raycast-specific rules.
const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([...raycastConfig]);