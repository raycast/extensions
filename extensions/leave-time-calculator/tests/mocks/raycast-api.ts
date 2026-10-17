const storage = new Map<string, string>();

export const LocalStorage = {
  async getItem<T>(key: string): Promise<T | undefined> {
    return storage.get(key) as T | undefined;
  },
  async setItem(key: string, value: string): Promise<void> {
    storage.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    storage.delete(key);
  },
};

export function getPreferenceValues<T>(): T {
  throw new Error("getPreferenceValues is not available in unit tests");
}

export function resetLocalStorage(): void {
  storage.clear();
}
