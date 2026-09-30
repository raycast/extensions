module.exports = {
  extends: ["@raycast"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    es6: true,
    node: true,
  },
  rules: {
    // Add any custom rules here
  },
}; 