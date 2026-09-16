const storage = new Map<string, string>();
let preferences: Record<string, unknown> = {};

export const LocalStorage = {
  getItem: async (key: string) => storage.get(key),
  removeItem: async (key: string) => {
    storage.delete(key);
  },
  setItem: async (key: string, value: string) => {
    storage.set(key, value);
  },
};

export function getPreferenceValues<T>() {
  return preferences as T;
}

export function resetRaycastMock() {
  preferences = {};
  storage.clear();
}

export function setMockPreferences(value: Record<string, unknown>) {
  preferences = value;
}

export function storedValue(key: string) {
  return storage.get(key);
}
