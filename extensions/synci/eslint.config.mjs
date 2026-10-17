import { defineConfig } from "eslint/config";
import raycast from "@raycast/eslint-config";

export default defineConfig([...raycast, { ignores: ["raycast-env.d.ts", "dist/**"] }]);
