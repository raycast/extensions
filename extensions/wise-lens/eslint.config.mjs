import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  // raycast-env.d.ts is auto-generated ("Do not modify manually") and ships an
  // eslint-disable for a rule removed in newer typescript-eslint; don't lint it.
  { ignores: ["raycast-env.d.ts", "dist/"] },
  ...raycastConfig,
]);
