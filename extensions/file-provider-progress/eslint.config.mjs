import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  {
    ignores: ["dist/**", "raycast-env.d.ts"],
  },
]);
