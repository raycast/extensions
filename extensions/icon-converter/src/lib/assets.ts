import { readFile } from "node:fs/promises";
import path from "node:path";

let assetsDir = "";
const cache = new Map<string, Promise<WebAssembly.Module>>();

/** Tell the codecs where the bundled .wasm files live (Raycast's `environment.assetsPath`). */
export function setAssetsDir(dir: string) {
  assetsDir = dir;
}

export function loadWasm(name: string): Promise<WebAssembly.Module> {
  let mod = cache.get(name);
  if (!mod) {
    mod = readFile(path.join(assetsDir, name)).then((bytes) => WebAssembly.compile(bytes));
    cache.set(name, mod);
  }
  return mod;
}

type Factory<T> = (overrides?: Record<string, unknown>) => Promise<T>;

/** Start an Emscripten codec from a bundled .wasm file instead of letting it fetch one. */
export async function startCodec<T>(factory: unknown, wasmName: string): Promise<T> {
  const wasm = await loadWasm(wasmName);
  return (factory as Factory<T>)({
    noInitialRun: true,
    instantiateWasm: (imports: WebAssembly.Imports, done: (instance: WebAssembly.Instance) => void) => {
      const instance = new WebAssembly.Instance(wasm, imports);
      done(instance);
      return instance.exports;
    },
  });
}
