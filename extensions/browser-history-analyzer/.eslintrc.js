/* eslint-env node */
/* global module */
module.exports = {
  root: true,
  extends: [
    "@raycast",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended"
  ],
  settings: {
    react: {
      version: "detect",
      pragma: "React"
    }
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/ban-ts-comment": ["error", {
      "ts-expect-error": "allow-with-description"
    }],
    "@typescript-eslint/no-empty-object-type": "off",
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-unused-vars": ["error", {
      "varsIgnorePattern": "^_",
      "argsIgnorePattern": "^_"
    }]
  }
};