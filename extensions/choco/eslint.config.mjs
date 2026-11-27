import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  {
    ignores: [".test-dist/**", "dist/**", "raycast-env.d.ts"],
  },
]);
