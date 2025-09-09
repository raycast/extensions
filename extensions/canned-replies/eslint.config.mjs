import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginRaycast from "@raycast/eslint-plugin";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node },
      parser: tseslint.parser,
    },
  },
  ...pluginRaycast.configs.recommended,
  prettier,
];

