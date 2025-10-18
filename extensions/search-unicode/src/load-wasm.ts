import { readFileSync } from "fs";
import path from "path";
import { environment } from "@raycast/api";
import { GoClass } from "./wasm-exec";
import type { Entry } from "./types";

const wasmBinary = readFileSync(path.join(environment.assetsPath, "main.wasm"));

export async function run(argv: string[]): Promise<Entry[]> {
  if (typeof WebAssembly !== "object") {
    throw new Error("WebAssembly is not supported in this environment.");
  }

  // waGlobalThis.fs.output = ""; // Reset output buffer

  console.log("WASM execution started", argv);
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
