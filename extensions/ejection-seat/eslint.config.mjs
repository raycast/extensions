import { defineConfig, globalIgnores } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([globalIgnores(["raycast-env.d.ts"]), ...raycastConfig]);
