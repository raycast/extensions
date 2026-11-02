import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

// Check the code we own; inherited native sources keep their upstream style.
export default defineConfig({
  files: ["src/**/*.{ts,tsx}", "service/**/*.ts", "scripts/**/*.ts", "tests/**/*.ts"],
  extends: [...tseslint.configs.recommended],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
  },
});
