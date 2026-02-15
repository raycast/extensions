const typescript = require("typescript");
const espree = require("espree");

function parseWithEspree(code, options) {
  const output = typescript.transpileModule(code, {
    compilerOptions: {
      allowJs: true,
      jsx: typescript.JsxEmit.Preserve,
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ESNext,
      isolatedModules: true,
    },
    fileName: "snippet.tsx",
  }).outputText;

  return espree.parse(output, {
    ecmaVersion: options?.ecmaVersion || "latest",
    sourceType: options?.sourceType || "module",
    ecmaFeatures: {
      jsx: true,
    },
    range: true,
    loc: true,
    comment: true,
    tokens: true,
  });
}

let parser = {
  parse(text, options) {
    return parseWithEspree(text, options);
  },
  parseForESLint(text, options) {
    const ast = parseWithEspree(text, options);
    return { ast };
  },
};
let plugins = {};

try {
  parser = require("@typescript-eslint/parser");
  plugins = { "@typescript-eslint": require("@typescript-eslint/eslint-plugin") };
} catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") {
    throw error;
  }
}

module.exports = [
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts"],
    languageOptions: {
      parser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
      },
    },
    plugins,
    rules: {
      "no-undef": "off",
    },
  },
];
