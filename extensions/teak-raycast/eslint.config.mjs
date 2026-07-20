import { defineConfig } from "eslint/config";
import ts from "typescript-eslint";

export default defineConfig(ts.configs.recommended, {
  ignores: ["dist/**", ".raycast/**"],
});
