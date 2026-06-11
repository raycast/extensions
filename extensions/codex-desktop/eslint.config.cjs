const js = require("@eslint/js")
const globals = require("globals")
const parser = require("@typescript-eslint/parser")

module.exports = [
  {
    ignores: ["dist", "node_modules", "**/*.d.ts"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2023,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },
  },
]
