import { defineConfig } from "eslint/config";
import raycast from "@raycast/eslint-config";

export default defineConfig([...raycast, { ignores: ["dist/**", "raycast-env.d.ts"] }]);
