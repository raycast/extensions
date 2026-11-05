import { resolve } from "node:path"
import { defineConfig, includeIgnoreFile } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import raycastConfig from "@raycast/eslint-config";

const gitignorePath = resolve(import.meta.dirname, '.gitignore')

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  ...raycastConfig,
  reactHooks.configs.flat.recommended,
);
