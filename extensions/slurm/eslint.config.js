const { defineConfig } = require("eslint/config");
const raycast = require("@raycast/eslint-config");
module.exports = defineConfig([
  // Flat config ignores .eslintignore; declare ignores here so the multi-megabyte
  // bundled output in dist/ (each file inlines node_modules) is never linted —
  // otherwise the ESLint worker OOMs ("JS heap out of memory").
  { ignores: ["dist/", "node_modules/", "raycast-env.d.ts", "eslint.config.js"] },
  ...raycast,
]);
