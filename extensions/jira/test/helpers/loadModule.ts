import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import ts from "typescript";

export function loadModule<T>(sourcePath: string, mocks: Record<string, unknown> = {}): T {
  const filename = resolve(sourcePath);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2023,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const require = createRequire(filename);
  const module = { exports: {} };
  const requireMock = (name: string) => (Object.hasOwn(mocks, name) ? mocks[name] : require(name));
  new Function("require", "module", "exports", "__filename", "__dirname", outputText)(
    requireMock,
    module,
    module.exports,
    filename,
    resolve(filename, ".."),
  );
  return module.exports as T;
}
