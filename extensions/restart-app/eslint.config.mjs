import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([{ ignores: ["node_modules/", "dist/", "raycast-env.d.ts"] }, ...raycastConfig]);
