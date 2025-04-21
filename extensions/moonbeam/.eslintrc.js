/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: [
    "@raycast"
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json"
  }
};