import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  {
    files: ["**/__tests__/**/*", "**/*.test.*", "**/__mocks__/**/*"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
