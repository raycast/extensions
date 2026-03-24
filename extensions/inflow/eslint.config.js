const { createRequire } = require("module");
const globals = require("globals");
const raycastPlugin = require("@raycast/eslint-plugin");

const raycastConfigRequire = createRequire(require.resolve("@raycast/eslint-config/package.json"));
const tsParser = raycastConfigRequire("@typescript-eslint/parser");

module.exports = [
  {
    ignores: ["node_modules/**", "dist/**"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.es2021,
        ...globals.node,
      },
    },
    plugins: {
      "@raycast": raycastPlugin,
    },
    rules: {
      ...raycastPlugin.configs.recommended.rules,
    },
  },
];
