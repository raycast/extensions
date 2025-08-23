module.exports = {
  extends: ["@raycast"],
  rules: {
    // Disable some strict rules for development
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-empty-function": "off",
  },
};
