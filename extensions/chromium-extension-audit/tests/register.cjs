const fs = require("node:fs");
const ts = require("typescript");

// Run the production TypeScript with Node's test runner without another build dependency.
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
