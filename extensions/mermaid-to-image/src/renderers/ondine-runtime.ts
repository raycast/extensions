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

export const getOndineRuntime = createOndineRuntimeLoader(async () => {
  const { wasm } = await import("ondine/compiler/wasm/all");
  return create({ modules: { all: wasm } });
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
