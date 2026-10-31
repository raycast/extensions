import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";
import raycastConfig from "@raycast/eslint-config";
import { defineConfig } from "eslint/config";
import importX from "eslint-plugin-import-x";

// Keep these folder dependencies in sync with ARCHITECTURE.md.
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
const productionIgnores = ["src/**/*.test.{ts,tsx}", "src/test/**"];

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
        {
          group: ["@/test", "@/test/**", "@/**/*.test", "@/**/*.test.*"],
          message: "Production code must not import tests.",
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
    ignores: productionIgnores,
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
            { target: "./src", from: "./src/test", message: "Production code must not import test helpers." },
            {
              target: "./src",
              from: ["./src/**/*.test.ts", "./src/**/*.test.tsx"],
              message: "Production code must not import tests.",
            },
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
    ignores: productionIgnores,
    rules: { "no-restricted-imports": restrictedImports(folder, folder === "features" || folder === "commands") },
  })),
  {
    files: ["src/cli/{client,errors,protocol,preferences,types}.ts"],
    rules: { "no-restricted-imports": restrictedImports("cli", true) },
  },
  {
    files: ["src/**/*.test.{ts,tsx}"],
    rules: {
      // `using fixture = ...` keeps a resource alive without reading the variable.
      "@typescript-eslint/no-unused-vars": ["error", { ignoreUsingDeclarations: true }],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "vitest",
              importNames: [
                "describe",
                "suite",
                "it",
                "spyOn",
                "beforeEach",
                "afterEach",
                "beforeAll",
                "afterAll",
                "aroundEach",
                "aroundAll",
              ],
              message: "Use top-level test with explicit Given/When/Then and local resource cleanup. See TESTING.md.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportDeclaration[source.value='vitest'] > ImportNamespaceSpecifier",
          message: "Import test and helpers explicitly so testing conventions remain enforceable.",
        },
        {
          selector:
            "CallExpression[callee.name=/^(describe|suite|it|beforeEach|afterEach|beforeAll|afterAll|aroundEach|aroundAll)$/]",
          message: "Use top-level test with explicit Given/When/Then and local resource cleanup. See TESTING.md.",
        },
        {
          selector: "MemberExpression[object.name='test'][property.name='concurrent']",
          message: "Keep tests sequential in a file. Console expectations are module-scoped. See TESTING.md.",
        },
        {
          selector: "CallExpression[callee.property.name='spyOn']:has(Identifier[name='console'])",
          message: "Declare expected logs through src/test/console.ts instead of replacing console spies.",
        },
        {
          selector: "CallExpression[callee.name='spyOn']:has(Identifier[name='console'])",
          message: "Declare expected logs through src/test/console.ts instead of replacing console spies.",
        },
        {
          selector: "AssignmentExpression[left.object.name='console'][left.property.name=/^(error|warn)$/]",
          message: "Declare expected logs through src/test/console.ts instead of replacing console spies.",
        },
      ],
    },
  },
]);
