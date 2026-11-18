import raycastConfig from "@raycast/eslint-config";
import { defineConfig } from "eslint/config";

export default defineConfig([
  ...raycastConfig,
  {
    rules: {
      "@raycast/prefer-title-case": "off",
    },
  },
]);
