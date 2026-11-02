import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";
import raycastConfig from "@raycast/eslint-config";
import { defineConfig } from "eslint/config";
import importX from "eslint-plugin-import-x";

// Keep these folder dependencies in sync with https://github.com/raulgg/raycast-extension-pods-control/blob/main/ARCHITECTURE.md.
const dependencies = {
  features: [],
  commands: ["features"],
  cli: ["features"],
  controls: ["features", "cli", "commands", "feedback", "setup", "subtitles"],
  status: ["features", "cli", "commands", "feedback", "subtitles"],
  subtitles: ["features", "cli", "commands"],
  setup: ["cli", "commands", "feedback", "homebrew"],
  homebrew: [],
  feedback: [],
};
const folders = Object.keys(dependencies);

function forbiddenFolders(folder) {
  return folders.filter((candidate) => candidate !== folder && !dependencies[folder].includes(candidate));
}

// The Node resolver handles relative imports. Mirror boundaries for the TS @/ alias.
function restrictedImports(folder, pure = false) {
  return [
    "error",
    {
      paths: pure ? builtinModules : [],
      patterns: [
        {
          group: forbiddenFolders(folder).flatMap((candidate) => [`@/${candidate}`, `@/${candidate}/**`]),
          message: `Keep ${folder} dependencies within its documented responsibilities.`,
        },
        { regex: "^@/[^/]+$", message: "Feature modules must not import Raycast entrypoints." },
        ...(pure
          ? [{ group: ["node:*", "@raycast/*"], message: "Keep state and contracts independent of Node and Raycast." }]
          : []),
      ],
    },
  ];
}

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
          zones: [
            ...folders.map((folder) => ({
              target: `./src/${folder}`,
              from: forbiddenFolders(folder).map((candidate) => `./src/${candidate}`),
              message: `Keep ${folder} dependencies within its documented responsibilities.`,
            })),
            {
              target: folders.map((folder) => `./src/${folder}`),
              from: ["./src/*.ts", "./src/*.tsx"],
              message: "Feature modules must not import Raycast entrypoints.",
            },
          ],
        },
      ],
    },
  },
  ...folders.map((folder) => ({
    files: [`src/${folder}/**/*.{ts,tsx}`],
    rules: { "no-restricted-imports": restrictedImports(folder, folder === "features" || folder === "commands") },
  })),
  {
    files: ["src/cli/{client,errors,protocol,preferences,types}.ts"],
    rules: { "no-restricted-imports": restrictedImports("cli", true) },
  },
]);
