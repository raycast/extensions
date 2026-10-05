const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  // Build output and the manifest-generated type definitions are not ours to lint.
  {
    ignores: ["dist/**", "raycast-env.d.ts"],
  },
  ...raycastConfig,
  // This config file is CommonJS by necessity, so `require()` is expected here.
  {
    files: ["eslint.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    rules: {
      "@raycast/prefer-title-case": [
        "warn",
        {
          extraFixedCaseWords: ["YouTube"],
        },
      ],
    },
  },
]);
