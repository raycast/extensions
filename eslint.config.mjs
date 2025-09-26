import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "raycast-env.d.ts"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-empty": "off",
      "prefer-const": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "warn",
    },
  },
);
