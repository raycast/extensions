import { dirname } from "path";
import { fileURLToPath } from "url";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/*.test.ts", "**/*.test.tsx"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Complexity rules
      complexity: ["warn", 15],
      "max-depth": ["warn", 4],
      "max-lines": ["warn", { max: 500, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 150, skipBlankLines: true, skipComments: true }],
      "max-params": ["warn", 5],
      "max-statements": ["warn", 30],

      // Code quality rules
      "no-console": "off", // Raycast extensions often use console for debugging
      "no-duplicate-imports": "error",
      "no-unused-expressions": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "no-throw-literal": "error",
      "prefer-promise-reject-errors": "error",

      // Best practices
      "no-async-promise-executor": "error",
      "no-await-in-loop": "warn",
      "no-return-await": "error",
      "require-await": "warn",

      // React/JSX rules (for Raycast views)
      "react-hooks/exhaustive-deps": "off", // Will add if react-hooks plugin is available
    },
  },
];
