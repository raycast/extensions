import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([{ ignores: ["dist/**", "assets/native/**", "raycast-env.d.ts"] }, ...raycastConfig]);
