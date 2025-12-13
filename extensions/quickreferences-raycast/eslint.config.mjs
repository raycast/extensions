import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["node_modules", "dist"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, prettier],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  }
);
