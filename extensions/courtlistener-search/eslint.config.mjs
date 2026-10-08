import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  // Auto-generated from the manifest by `ray develop`/`ray build`, and not ours to lint.
  { ignores: ["raycast-env.d.ts"] },
  ...raycastConfig,
]);
