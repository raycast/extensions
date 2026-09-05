const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "no-restricted-syntax": [
        "error",
        {
          selector: "FunctionDeclaration, FunctionExpression",
          message: "Use an arrow function instead.",
        },
      ],
    },
  },
]);
