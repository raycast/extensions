// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import raycast from "@raycast/eslint-plugin";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    plugins: { "@raycast": raycast },
    rules: {
      "@raycast/prefer-title-case": "warn",
    },
  },
);
