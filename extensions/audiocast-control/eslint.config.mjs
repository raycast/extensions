import raycastConfig from "@raycast/eslint-config";

export default [
  ...raycastConfig,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: ["if", "switch", "return", "for", "while", "do", "try", "throw"] },
        { blankLine: "any", prev: ["if"], next: ["if"] },
        { blankLine: "any", prev: ["const", "let", "var"], next: ["const", "let", "var"] },
      ],
    },
  },
];
