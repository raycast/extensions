import raycastConfig from "@raycast/eslint-config";
import perfectionist from "eslint-plugin-perfectionist";
import { defineConfig } from "eslint/config";

const config = defineConfig([...raycastConfig, perfectionist.configs["recommended-natural"]]);

export default config;
