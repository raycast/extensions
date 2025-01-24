/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: "@raycast/eslint-config",
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "react-hooks/exhaustive-deps": "off",
    "@typescript-eslint/no-unused-vars": ["warn", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "ignoreRestSiblings": true
    }],
    "@typescript-eslint/ban-ts-comment": "off"
  },
  parserOptions: {
    project: "./tsconfig.json"
  }
}; 