const raycastConfig = require("@raycast/eslint-config");

module.exports = [
  ...raycastConfig.flat(),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
];
