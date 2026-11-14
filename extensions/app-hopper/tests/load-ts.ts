import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

// The VM intentionally accepts partial, heterogeneous modules and malformed fixtures.
// Keep their dynamic values at this mocking boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockValue = any;
export type MockFunction = (...args: MockValue[]) => MockValue;
export type MockModules = Record<string, Record<string, MockFunction | object | string | number | boolean | undefined>>;

// Run TypeScript modules with native dependencies replaced, without
// changing global require hooks or requiring a live Raycast/macOS session.
export default function createLoader(mocks: MockModules) {
  const cache = new Map<string, { exports: Record<string, MockValue> }>();
  function load(filename: string): Record<string, MockValue> {
    filename = path.resolve(__dirname, "..", filename);
    if (cache.has(filename)) return cache.get(filename)!.exports;
    const module: { exports: Record<string, MockValue> } = { exports: {} };
    cache.set(filename, module);
    const nativeRequire = createRequire(filename);
    function requireModule(id: string) {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith(".")) {
        const target = path.resolve(path.dirname(filename), id);
        if (fs.existsSync(`${target}.ts`)) return load(`${target}.ts`);
        if (fs.existsSync(`${target}.tsx`)) return load(`${target}.tsx`);
      }
      return nativeRequire(id);
    }
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    const execute = vm.runInThisContext(`(function(exports, require, module) { ${outputText}\n})`, { filename });
    execute(module.exports, requireModule, module);
    return module.exports;
  }
  return load;
}
