import type { KV } from "../lib/store";

/** A Map-backed KV, optionally seeded; `data` is the Map, for reading raw values back. */
export function memoryKV(init: Record<string, string> = {}): KV & { data: Map<string, string> } {
  const data = new Map(Object.entries(init));
  return {
    data,
    get: async (k) => data.get(k),
    set: async (k, v) => void data.set(k, v),
  };
}
