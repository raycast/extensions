// Disposable spike only. Production imports must live in ondine-runtime.ts.
import { create, RenderError } from "ondine/compiler/wasm";

export { RenderError };
let rendererPromise;
export function getRenderer() {
  rendererPromise ??= import("ondine/compiler/wasm/all")
    .then(({ wasm }) => create({ modules: { all: wasm } }))
    .catch((error) => {
      rendererPromise = undefined;
      throw error;
    });
  return rendererPromise;
}
