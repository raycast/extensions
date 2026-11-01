const raycast = require("@raycast/eslint-config");

module.exports = [
  ...raycast,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
