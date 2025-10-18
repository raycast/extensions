import { GoClass } from "./wasm-exec";
import type { Entry } from "./types";

export async function run(
  wasmBinary: Buffer<ArrayBufferLike>,
  argv: string[],
): Promise<Entry[]> {
  if (typeof WebAssembly !== "object") {
    throw new Error("WebAssembly is not supported in this environment.");
  }

  const output = await new Promise<string>((resolve, reject) => {
    const go = new GoClass();
    go.argv = argv;
    go.exit = (code: number) => {
      if (code > 0) {
        reject(new Error(`WASM execution failed with exit code ${code}`));
      }
      resolve(go.waGlobalThis.fs.output);
    };

    WebAssembly.instantiate(wasmBinary, go.importObject).then((result) => {
      go.run(result.instance);
    });
  });

  return JSON.parse(output);
}
