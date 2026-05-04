const tseslint = require("typescript-eslint");

module.exports = tseslint.config(...tseslint.configs.recommended, {
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
  },
  ignores: ["node_modules/**", "dist/**", ".tmp-home/**", ".tmp-config/**", ".tmp-test/**"],
});
