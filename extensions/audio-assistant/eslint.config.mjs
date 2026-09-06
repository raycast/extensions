import raycastConfig from "@raycast/eslint-config";
import { defineConfig } from "eslint/config";
export default defineConfig([
  ...raycastConfig,
  { ignores: [".native-test/**", ".tools/**", "dist/**", "raycast-env.d.ts"] },
]);
