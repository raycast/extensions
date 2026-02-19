import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import raycastPlugin from "@raycast/eslint-plugin";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    plugins: {
      "@raycast": raycastPlugin,
    },
    rules: {
      ...raycastPlugin.configs.recommended.rules,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: "18.3.1",
      },
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
  },
];
