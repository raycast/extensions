/**
 * Manual mock for @raycast/api used in tests.
 * Provides a minimal LocalStorage implementation backed by a Map,
 * plus mock Toast and showToast for error handling tests.
 */

const storage = new Map<string, string>();

export const LocalStorage = {
  getItem: async (key: string): Promise<string | undefined> => {
    return storage.get(key) ?? undefined;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    storage.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    storage.delete(key);
  },
  allItems: async (): Promise<Record<string, string>> => {
    return Object.fromEntries(storage);
  },
  clear: async (): Promise<void> => {
    storage.clear();
  },
  /** Exposed for test cleanup — not part of the real API */
  __storage: storage,
};

export const Toast = {
  Style: {
    Success: "SUCCESS",
    Failure: "FAILURE",
    Animated: "ANIMATED",
  },
};

export const Color = {
  Green: "green",
  Red: "red",
  Orange: "orange",
  Blue: "blue",
  Purple: "purple",
  Yellow: "yellow",
  SecondaryText: "secondaryText",
  PrimaryText: "primaryText",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const showToast = jest.fn(async (_options: { style: string; title: string; message?: string }) => {
  // no-op mock — tests can inspect calls via showToast.mock.calls
});
