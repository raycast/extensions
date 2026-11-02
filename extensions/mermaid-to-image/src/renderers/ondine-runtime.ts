import { create, RenderError } from "ondine/compiler/wasm";
import extension from "../../package.json";

export const ONDINE_VERSION = extension.dependencies.ondine;
export type OndineRuntime = ReturnType<typeof create>;

export function createOndineRuntimeLoader<T>(initialize: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    pending ??= Promise.resolve()
      .then(initialize)
      .catch((error: unknown) => {
        pending = undefined;
        throw error;
      });
    return pending;
  };
}

export function resolveOndineWasm(module: unknown): string | WebAssembly.Module {
  const exports = module as { wasm?: unknown; default?: { wasm?: unknown } } | null | undefined;
  // Store-packaged CommonJS dependencies expose their exports under `default` on native import().
  const wasm = exports?.wasm ?? exports?.default?.wasm;
  if ((typeof wasm === "string" && wasm.length > 0) || wasm instanceof WebAssembly.Module) return wasm;
  throw new Error("Ondine compiler module is missing or invalid (expected wasm or default.wasm).");
}

export const getOndineRuntime = createOndineRuntimeLoader(async () => {
  const module = await import("ondine/compiler/wasm/all");
  return create({ modules: { all: resolveOndineWasm(module) } });
});

export function getOndineDiagnostic(error: unknown) {
  if (!(error instanceof RenderError)) return undefined;
  return {
    code: error.code,
    line: error.line > 0 ? error.line : undefined,
    column: error.column > 0 ? error.column : undefined,
    snippet: error.snippet,
    message: error.message,
  };
}
