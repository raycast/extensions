import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  {
    ignores: ["raycast-env.d.ts"],
  },
]);
