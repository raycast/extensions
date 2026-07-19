// =============================================================================
// ESLINT CONFIG
// Raycast's shared config, plus this project's limits and import hygiene.
// -----------------------------------------------------------------------------
// Context: Raycast's `ray lint` runs ESLint AND Prettier, and its shared config
//   pulls in eslint-config-prettier — so Prettier owns all formatting and no
//   stylistic rule may be added here. Everything below is a *quality* rule
//   (correctness, dead code, import order); none of it touches whitespace, so
//   nothing fights Prettier.
// NOTE: The size limits are the authoritative enforcement of the conventions in
//   CONTRIBUTING.md. Blank lines and comments are excluded, so a well-commented
//   file is never penalised.
// =============================================================================

import raycastConfig from "@raycast/eslint-config";
import { defineConfig, globalIgnores } from "eslint/config";
import perfectionist from "eslint-plugin-perfectionist";
import unusedImports from "eslint-plugin-unused-imports";

export default defineConfig([
  globalIgnores([".test-build/", "swift/", "dist/"]),

  ...raycastConfig,

  {
    files: ["src/**/*.ts", "src/**/*.tsx", "test/**/*.ts"],
    plugins: { perfectionist, "unused-imports": unusedImports },
    rules: {
      // --- Size and typing limits (CONTRIBUTING.md) --------------------------
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 50, skipBlankLines: true, skipComments: true }],
      "@typescript-eslint/explicit-function-return-type": ["error", { allowExpressions: true }],
      "@typescript-eslint/no-explicit-any": "error",

      // --- Dead code ---------------------------------------------------------
      "unused-imports/no-unused-imports": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-vars": [
        "error",
        { vars: "all", args: "after-used", argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // --- Import hygiene ----------------------------------------------------
      // Enforces the documented grouping: external -> internal -> type imports.
      // NOTE: perfectionist v5 takes a NUMBER here (blank lines between groups),
      //   not the "always" string that v3 used.
      "perfectionist/sort-imports": [
        "error",
        {
          type: "natural",
          order: "asc",
          newlinesBetween: 1,
          groups: [["builtin", "external"], ["internal", "parent", "sibling", "index"], "type"],
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],

      // --- Correctness -------------------------------------------------------
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
    },
  },

  {
    // A `describe` block is a suite, not a function — the 50-line limit exists to
    // keep logic decomposable and would only push test cases apart artificially.
    files: ["test/**/*.ts"],
    rules: {
      "max-lines-per-function": "off",
    },
  },
]);
