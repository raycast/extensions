// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    ignores: ["node_modules/**", "dist/**", ".raycast/**"],
    rules: {
      // Allow unused variables that start with underscore
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      // Turn off regular no-unused-vars in favor of the TypeScript version
      "no-unused-vars": "off",
      // Adjust any other rules as needed
      "react/react-in-jsx-scope": "off"
    }
  },
  {
    // Specific rules for our exported function that might trigger warnings
    files: ["**/tana-converter.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off"
    }
  }
]; 