module.exports = {
  extends: "@raycast",
  overrides: [
    {
      files: ["**/*.test.ts", "**/__mocks__/**", "**/__tests__/**"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
          },
        ],
      },
    },
  ],
};
