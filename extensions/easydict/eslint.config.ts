import { defineConfig, globalIgnores } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  {
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  globalIgnores(["overrides/*"]),
]);
