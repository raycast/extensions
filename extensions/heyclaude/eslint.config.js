import { defineConfig } from "eslint/config";
import raycast from "@raycast/eslint-config";

export default defineConfig([
  ...raycast,
  {
    rules: {
      "@raycast/prefer-title-case": "off",
    },
  },
]);
