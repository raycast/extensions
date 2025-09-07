import raycastPlugin from "@raycast/eslint-config";

import reactHooksPlugin from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export default defineConfig([...raycastPlugin, reactHooksPlugin.configs["recommended-latest"]]);
