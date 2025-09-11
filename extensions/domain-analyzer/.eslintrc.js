module.exports = {
  extends: ["@raycast", "prettier"],
  ignorePatterns: ["dist/", "node_modules/"],
  rules: {
    // Allow reasonable flexibility while maintaining code quality
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/ban-ts-comment": "off",
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
}; 