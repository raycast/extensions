const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**"],
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
    },
  }
);