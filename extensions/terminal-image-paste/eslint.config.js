import { defineConfig } from "eslint/config";
import raycast from "@raycast/eslint-config";

export default defineConfig([
  { ignores: ["raycast-env.d.ts", "dist/**"] },
  ...raycast,
]);
