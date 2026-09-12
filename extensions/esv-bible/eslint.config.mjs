import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
  },
  {
    ignores: ["node_modules/", "dist/", "assets/"],
  }
);
