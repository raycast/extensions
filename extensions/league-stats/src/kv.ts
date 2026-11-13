/** Minimal synchronous string store, so the data layer does not depend on Raycast's Cache directly. */
export interface KV {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

export function memoryKV(): KV {
  const map = new Map<string, string>();
  return {
    get: (key) => map.get(key),
    set: (key, value) => void map.set(key, value),
  };
}
