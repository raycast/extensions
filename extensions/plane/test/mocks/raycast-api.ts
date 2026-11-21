/** Minimal stand-in for `@raycast/api` in unit tests. */
export const preferences: Record<string, string | undefined> = {
  API_BASE_PATH: "https://api.plane.so",
  APP_BASE_URL: "https://app.plane.so",
};

export function getPreferenceValues<T>(): T {
  return preferences as T;
}

/** In-memory `Cache`. Instances with the same namespace share entries, like separate commands on disk. */
export class Cache {
  static readonly stores = new Map<string, Map<string, string>>();
  private readonly map: Map<string, string>;

  constructor(options: { namespace?: string } = {}) {
    const namespace = options.namespace ?? "";
    if (!Cache.stores.has(namespace)) Cache.stores.set(namespace, new Map());
    this.map = Cache.stores.get(namespace)!;
  }

  get(key: string): string | undefined {
    return this.map.get(key);
  }

  set(key: string, value: string): void {
    this.map.set(key, value);
  }

  remove(key: string): boolean {
    return this.map.delete(key);
  }
}
