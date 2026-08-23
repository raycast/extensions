import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import { dirname } from "path";
import { fileURLToPath } from "url";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  recommendedConfig: js.configs.recommended,
});

export default [
  ...compat.config({
    env: {
      es2020: true,
      node: true,
    },
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier", "plugin:@raycast/recommended"],
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
  }),
];