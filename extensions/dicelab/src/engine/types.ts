// TypeScript interfaces for WASM engine

export interface EvaluateResponse {
  result: string;
  pmf?: unknown;
}

export interface WasmEngine {
  evaluate(input: string): EvaluateResponse | string;
  setLogLevel(level: string): void;
  getLogConfig(): unknown;
  getAliases(): Record<string, unknown>;
  setAliases(aliases: Record<string, unknown>): void;
  resetContext(): void;
  importDdb(characterId: string): Promise<Record<string, unknown>>;
}

export interface WasmModule {
  WasmEngine: new (storageKey: string) => WasmEngine;
}
