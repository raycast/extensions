// Mock implementation of @raycast/api LocalStorage for testing

const storage = new Map<string, string>();

export const LocalStorage = {
  getItem: async <T = string>(key: string): Promise<T | undefined> => {
    const value = storage.get(key);
    return value as T | undefined;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    storage.set(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    storage.delete(key);
  },

  clear: async (): Promise<void> => {
    storage.clear();
  },

  allItems: async (): Promise<Record<string, string>> => {
    return Object.fromEntries(storage);
  },
};

// Helper to clear storage between tests (exported for test setup)
export const __resetMockStorage = () => {
  storage.clear();
};
