import raycastConfig from "@raycast/eslint-config";
import { defineConfig } from "eslint/config";

export default defineConfig([{ ignores: ["raycast-env.d.ts"] }, ...raycastConfig]);
