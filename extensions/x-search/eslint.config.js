import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";
import raycastConfig from "@raycast/eslint-config";
import { defineConfig } from "eslint/config";
import importX from "eslint-plugin-import-x";

const dependencies = {
  features: [],
  lib: ["features"],
  components: ["features"],
};
const folders = Object.keys(dependencies);

function forbiddenFolders(folder) {
  return folders.filter((candidate) => candidate !== folder && !dependencies[folder].includes(candidate));
}

export function boundaryZones(sourceRoot) {
  return [
    ...folders
      .filter((folder) => forbiddenFolders(folder).length > 0)
      .map((folder) => ({
        target: `${sourceRoot}/${folder}`,
        from: forbiddenFolders(folder).map((candidate) => `${sourceRoot}/${candidate}`),
        message: `Keep ${folder} dependencies within its documented responsibilities.`,
      })),
    {
      target: folders.map((folder) => `${sourceRoot}/${folder}`),
      from: [`${sourceRoot}/*.ts`, `${sourceRoot}/*.tsx`],
      message: "Modules under src/ folders must not import Raycast entrypoints.",
    },
  ];
}

const RELATIVE_IMPORTS_ONLY = {
  group: ["@/*"],
  message: "Use relative imports in production code so folder boundaries stay checked.",
};

const PURE_MODULE_IMPORTS = [
  "error",
  {
    paths: [...builtinModules, "react", "react-dom"],
    patterns: [
      RELATIVE_IMPORTS_ONLY,
      {
        group: ["node:*", "react/*", "react-dom/*", "@raycast/*"],
        message: "Keep feature modules independent of Node, React, and Raycast.",
      },
    ],
  },
];

const PRODUCTION_IMPORTS = [
  "error",
  {
    patterns: [RELATIVE_IMPORTS_ONLY],
  },
];

export default defineConfig([
  ...raycastConfig,
  {
    plugins: { "import-x": importX },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "import-x/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
          "newlines-between": "never",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    settings: { "import-x/resolver": { node: { extensions: [".js", ".jsx", ".ts", ".tsx", ".json"] } } },
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        {
          basePath: fileURLToPath(new URL(".", import.meta.url)),
          zones: boundaryZones("./src"),
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}", "extension/src/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": PRODUCTION_IMPORTS },
  },
  {
    files: ["src/features/**/*.{ts,tsx}", "extension/src/features/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": PURE_MODULE_IMPORTS },
  },
]);
