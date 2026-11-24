import raycastConfig from "@raycast/eslint-config";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([globalIgnores(["raycast-env.d.ts"]), ...raycastConfig]);
