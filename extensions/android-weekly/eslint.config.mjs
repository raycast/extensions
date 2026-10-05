import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([...raycastConfig, { ignores: ["node_modules/**", "dist/**", "compiled_raycast_swift/**", "compiled_raycast_rust/**"] }]);
