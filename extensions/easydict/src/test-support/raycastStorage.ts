import type { Cache, LocalStorage } from "@raycast/api";

export function createCacheMock(namespaces = new Map<string, Map<string, string>>()) {
  return class InMemoryCache {
    private readonly entries: Map<string, string>;

    constructor({ namespace = "" }: Pick<Cache.Options, "namespace"> = {}) {
      this.entries = namespaces.get(namespace) ?? new Map<string, string>();
      namespaces.set(namespace, this.entries);
    }

    get(key: string) {
      return this.entries.get(key);
    }

    set(key: string, value: string) {
      this.entries.set(key, value);
    }

    remove(key: string) {
      return this.entries.delete(key);
    }

    clear() {
      this.entries.clear();
    }
  };
}

export function createLocalStorageMock<Value extends LocalStorage.Value>(entries: Map<string, Value>) {
  return {
    async getItem(key: string) {
      return entries.get(key);
    },
    async setItem(key: string, value: Value) {
      entries.set(key, value);
    },
  };
}
