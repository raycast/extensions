import { LocalStorage } from "@raycast/api";

export interface RefreshableStorage<T> {
  get: () => Promise<T>;
  refresh: () => Promise<T>;
  clear: () => Promise<void>;
}

export interface RefreshableMapStorage<K, V> {
  get: (key: K) => Promise<V | undefined>;
  getMany: (keys: K[]) => Promise<{ values: V[]; missingKeys: K[] }>;
  set: (key: K, value: V) => Promise<void>;
  setMany: (keysAndValues: [K, V][]) => Promise<void>;
  refresh: () => Promise<[K, V][]>;
  clear: () => Promise<void>;
}

export function refreshableStorage<T>(key: string, fetch: () => Promise<T>): RefreshableStorage<T> {
  let inMemoryData: T | null = null;
  let currentPromise: Promise<T> | null = null;

  const refresh = async () => {
    if (currentPromise) {
      return currentPromise;
    }
    const fetchAndStore = async () => {
      const data = await fetch();
      inMemoryData = data;
      await LocalStorage.setItem(key, JSON.stringify(data));
      return data;
    };

    currentPromise = fetchAndStore();
    await currentPromise;
    const result = currentPromise;
    currentPromise = null;
    return result;
  };

  return {
    async get() {
      if (inMemoryData) {
        return Promise.resolve(inMemoryData);
      }

      const rawItem = await LocalStorage.getItem<string>(key);
      if (rawItem) {
        const data = JSON.parse(rawItem) as T;
        inMemoryData = data;
        return Promise.resolve(data);
      }

      return refresh();
    },
    refresh,
    async clear() {
      inMemoryData = null;
      return await LocalStorage.removeItem(key);
    },
  };
}

export function refreshableMapStorage<K extends string | number | symbol, V>(
  itemKey: string,
  fetch: () => Promise<[K, V][]>
): RefreshableMapStorage<K, V> {
  let inMemoryData: Map<K, V> | null = null;
  let currentPromise: Promise<[K, V][]> | null = null;

  const refresh = async () => {
    if (currentPromise) {
      return currentPromise;
    }
    const fetchAndStore = async () => {
      const data = await fetch();
      inMemoryData = new Map(data);
      await LocalStorage.setItem(itemKey, JSON.stringify(data));
      return data;
    };

    currentPromise = fetchAndStore();
    await currentPromise;
    const result = currentPromise;
    currentPromise = null;
    return result;
  };

  return {
    async get(key: K) {
      const inMemoryValue = inMemoryData?.get(key);
      if (inMemoryValue) {
        return Promise.resolve(inMemoryValue);
      }

      const rawItem = await LocalStorage.getItem<string>(itemKey);
      if (rawItem) {
        const data = new Map(JSON.parse(rawItem) as [K, V][]);
        inMemoryData = data;
        const existing = data.get(key);
        if (existing) {
          return Promise.resolve(existing);
        }
      }

      const refreshedData = new Map(await refresh());
      return refreshedData.get(key);
    },
    async getMany(keys: K[]) {
      const values: V[] = [];
      const missingKeys = keys;
      const addValuesAndMissingKeys = (data: Map<K, V>) => {
        for (let i = missingKeys.length - 1; i >= 0; i--) {
          const value = data.get(missingKeys[i]);
          if (value) {
            values.push(value);
            missingKeys.splice(i, 1);
          }
        }
      };

      if (inMemoryData) {
        addValuesAndMissingKeys(inMemoryData);
      }

      if (missingKeys.length > 0) {
        const rawItem = await LocalStorage.getItem<string>(itemKey);
        if (rawItem) {
          const data = new Map(JSON.parse(rawItem) as [K, V][]);
          inMemoryData = data;
          addValuesAndMissingKeys(data);
        }
      }

      if (missingKeys.length > 0) {
        const refreshedData = new Map(await refresh());
        addValuesAndMissingKeys(refreshedData);
      }

      return { values, missingKeys };
    },
    async set(key: K, value: V) {
      if (inMemoryData) {
        inMemoryData.set(key, value);
      } else {
        const rawItem = await LocalStorage.getItem<string>(itemKey);
        if (rawItem) {
          const data = new Map(JSON.parse(rawItem) as [K, V][]);
          data.set(key, value);
          inMemoryData = data;
        } else {
          inMemoryData = new Map([[key, value]]);
        }
      }

      const serializedData = JSON.stringify(Array.from(inMemoryData));
      await LocalStorage.setItem(itemKey, serializedData);
    },
    async setMany(keysAndValues) {
      if (inMemoryData) {
        for (const [key, value] of keysAndValues) {
          inMemoryData.set(key, value);
        }
      } else {
        const rawItem = await LocalStorage.getItem<string>(itemKey);
        if (rawItem) {
          const data = new Map(JSON.parse(rawItem) as [K, V][]);
          for (const [key, value] of keysAndValues) {
            data.set(key, value);
          }
          inMemoryData = data;
        } else {
          inMemoryData = new Map(keysAndValues);
        }
      }

      const serializedData = JSON.stringify(Array.from(inMemoryData));
      await LocalStorage.setItem(itemKey, serializedData);
    },
    refresh,
    async clear() {
      inMemoryData = null;
      return await LocalStorage.removeItem(itemKey);
    },
  };
}
