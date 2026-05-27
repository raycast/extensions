const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  {
    files: ["src/domain/**/*.ts", "src/application/**/*.ts", "src/interface-adapters/**/*.ts"],
    ignores: ["src/**/*.spec.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/strict-boolean-expressions": "error",
    },
  },
  {
    files: ["src/domain/**/*.ts"],
    ignores: ["src/**/*.spec.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSPropertySignature[optional=true]",
          message: "Do not use optional property in domain layer.",
        },
        {
          selector: "TSMethodSignature[optional=true]",
          message: "Do not use optional method in domain layer.",
        },
        {
          selector:
            ":matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression) > Identifier[optional=true]",
          message: "Do not use optional parameter in domain layer.",
        },
        {
          selector: "ThrowStatement",
          message: "Do not use throw in domain layer. Return a result value instead.",
        },
      ],
    },
  },
]);
