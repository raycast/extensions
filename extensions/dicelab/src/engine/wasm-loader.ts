// WASM loader for nodejs target

import { environment } from "@raycast/api";
import path from "path";
import type { WasmModule } from "./types";

let wasmModule: WasmModule | null = null;
let loading: Promise<WasmModule> | null = null;

export async function loadWasm(): Promise<WasmModule> {
  if (wasmModule) return wasmModule;

  if (!loading) {
    loading = (async () => {
      // In production, WASM files are in assets/wasm/
      // The path is relative to the extension's root directory
      const wasmPath = path.join(environment.assetsPath, "wasm", "dicebook.js");

      try {
        // Dynamic import of the WASM module
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const module = require(wasmPath) as WasmModule;
        return module;
      } catch (error) {
        console.error("Failed to load WASM module:", error);
        throw new Error(
          `Failed to load Dicelab engine: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    })();
  }

  wasmModule = await loading;
  return wasmModule;
}
