// Flat config for ESLint 9. Mirrors what @raycast/eslint-config@2.1.1 exports,
// but with `raycast.configs.recommended` spread instead of nested — the upstream
// preset ships it as a single-element array which ESLint 9 rejects directly.
// Wrapped in `defineConfig` per Raycast project convention (type-checks the
// config shape and matches the toolchain pattern).
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import raycast from "@raycast/eslint-plugin";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node },
    },
  },
  ...raycast.configs.recommended,
  prettier,
]);
