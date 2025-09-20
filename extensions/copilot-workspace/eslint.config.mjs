import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [pluginJs.configs.recommended, ...tseslint.configs.recommended];
