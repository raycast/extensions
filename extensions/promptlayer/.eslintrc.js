module.exports = {
  extends: ["@raycast"],
  rules: {
    // Add any custom rules here
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "prefer-const": "error",
  },
};
