import raycastConfig from "@raycast/eslint-config";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";

export default defineConfig([
  ...raycastConfig,
  eslintPluginUnicorn.configs.recommended,
  {
    rules: {
      "unicorn/better-regex": "warn",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-anonymous-default-export": "off",
    },
  },
]);
