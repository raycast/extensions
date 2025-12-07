// Engine singleton with context persistence

import type { WasmEngine } from "./types";
import { loadAliases, saveAliases } from "./storage";
import { loadWasm } from "./wasm-loader";
import { CONTEXT_STORAGE_KEY } from "../utils/constants";

let engine: WasmEngine | null = null;
let loading: Promise<WasmEngine> | null = null;

export async function getEngine(): Promise<WasmEngine> {
  if (engine) return engine;

  if (!loading) {
    loading = (async () => {
      const wasm = await loadWasm();
      const instance = new wasm.WasmEngine(CONTEXT_STORAGE_KEY);

      // Restore aliases from LocalStorage
      const savedAliases = await loadAliases();
      if (Object.keys(savedAliases).length > 0) {
        instance.setAliases(savedAliases);
      }

      return instance;
    })();
  }

  engine = await loading;
  return engine;
}

export async function syncAliasesToStorage(): Promise<void> {
  if (!engine) return;
  const aliases = engine.getAliases();

  // Convert Map to plain object for JSON serialization
  const aliasesObj =
    aliases instanceof Map ? Object.fromEntries(aliases) : aliases;

  await saveAliases(aliasesObj);
}

export async function resetEngine(): Promise<void> {
  if (engine) {
    engine.resetContext();
    engine = null;
    loading = null;
  }
}
