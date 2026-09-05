import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  // Generated from the manifest by `ray build`; not ours to fix.
  { ignores: ["raycast-env.d.ts"] },
  ...raycastConfig,
]);
