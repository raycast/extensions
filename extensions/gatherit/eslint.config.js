// Self-contained ESLint flat config for the Raycast extension. `@raycast/eslint-config`
// exports a flat-config array that contains nested arrays (e.g. the Raycast
// plugin's recommended set), so it must be flattened via `defineConfig` —
// passing it raw makes ESLint throw "Unexpected array". Having this file here
// also stops ESLint from walking up to the repo-root Next.js config.
const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([raycastConfig]);
