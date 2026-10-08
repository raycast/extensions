import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

// `@raycast/eslint-config` exports the base config; pass it directly to defineConfig
export default defineConfig([...raycastConfig]);
