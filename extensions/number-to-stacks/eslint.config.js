import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  { ignores: ["dist/**", "node_modules/**", "raycast-env.d.ts"] },
  ...raycastConfig,
]);
