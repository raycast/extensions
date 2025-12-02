import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([...raycastConfig, reactHooks.configs["recommended-latest"]]);
