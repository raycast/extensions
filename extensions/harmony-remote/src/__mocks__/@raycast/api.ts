/**
 * Mock for @raycast/api — provides LocalStorage and getPreferenceValues
 * used by harmony.ts without requiring the Raycast runtime.
 */

const store: Record<string, string> = {};

export const LocalStorage = {
  getItem: jest.fn(async <T>(key: string): Promise<T | undefined> => {
    return store[key] as T | undefined;
  }),
  setItem: jest.fn(async (key: string, value: string): Promise<void> => {
    store[key] = value;
  }),
  removeItem: jest.fn(async (key: string): Promise<void> => {
    delete store[key];
  }),
  clear: jest.fn(async (): Promise<void> => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  }),
  allItems: jest.fn(async (): Promise<Record<string, string>> => {
    return { ...store };
  }),
  _store: store,
};

let preferences: Record<string, string> = {
  commandHoldTime: "100",
  commandDelay: "50",
};

export function getPreferenceValues<T>(): T {
  return preferences as T;
}

export function _setPreferences(prefs: Record<string, string>): void {
  preferences = prefs;
}

export function _resetStore(): void {
  for (const key of Object.keys(store)) {
    delete store[key];
  }
  preferences = { commandHoldTime: "100", commandDelay: "50" };
  LocalStorage.getItem.mockClear();
  LocalStorage.setItem.mockClear();
  LocalStorage.removeItem.mockClear();
  LocalStorage.clear.mockClear();
}
