import raycastConfig from "@raycast/eslint-config";

import reactHooksConfig from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export default defineConfig([...raycastConfig, reactHooksConfig.configs["recommended-latest"]]);
