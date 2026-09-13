import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  {
    ignores: [".tmp/**", "dist/**", "node_modules/**"],
  },
]);
