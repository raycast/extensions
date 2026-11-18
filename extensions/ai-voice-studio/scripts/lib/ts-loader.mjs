import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

export function createTsLoader({ root = process.cwd(), raycastApiStub = {}, overrides = {} } = {}) {
  const moduleCache = new Map();

  function loadTs(relativePath) {
    const filename = resolveTs(path.join(root, relativePath));
    if (moduleCache.has(filename)) return moduleCache.get(filename).exports;

    const source = fs.readFileSync(filename, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
      },
      fileName: filename,
    }).outputText;

    const mod = new Module(filename);
    mod.filename = filename;
    mod.paths = Module._nodeModulePaths(path.dirname(filename));
    moduleCache.set(filename, mod);

    const nativeRequire = mod.require.bind(mod);
    mod.require = (request) => {
      if (overrides[request]) return overrides[request];
      if (request === "@raycast/api") return raycastApiStub;
      if (request.startsWith(".")) {
        const next = resolveTs(path.resolve(path.dirname(filename), request));
        if (overrides[next]) return overrides[next];
        return loadTs(path.relative(root, next));
      }
      return nativeRequire(request);
    };

    mod._compile(compiled, filename);
    return mod.exports;
  }

  return loadTs;
}

function resolveTs(candidate) {
  const candidates = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.js`,
    path.join(candidate, "index.ts"),
    path.join(candidate, "index.tsx"),
  ];
  const found = candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
  if (!found) throw new Error(`Cannot resolve module ${candidate}`);
  return found;
}
