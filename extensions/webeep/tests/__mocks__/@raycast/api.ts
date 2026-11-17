/* Minimal in-memory stand-in for @raycast/api used by vitest. */
export const mockPreferences: Record<string, unknown> = {
  sessionCookie: "abc123sessioncookie",
  language: "en",
  downloadDirectory: "~/Downloads",
};

export function getPreferenceValues<T>(): T {
  return mockPreferences as T;
}

const store = new Map<string, string | number | boolean>();

export const LocalStorage = {
  getItem: async <T>(key: string): Promise<T | undefined> => store.get(key) as T | undefined,
  setItem: async (key: string, value: string | number | boolean): Promise<void> => {
    store.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    store.delete(key);
  },
  clear: async (): Promise<void> => store.clear(),
  allItems: async (): Promise<Record<string, string | number | boolean>> => Object.fromEntries(store),
};

export const Toast = { Style: { Failure: "failure", Success: "success", Animated: "animated" } };
export const showToast = async (): Promise<Record<string, never>> => ({});
export const showHUD = async (): Promise<void> => {};
export const open = async (): Promise<void> => {};
export const openExtensionPreferences = async (): Promise<void> => {};
export const Clipboard = { copy: async (): Promise<void> => {} };
export const Icon = new Proxy({}, { get: (_target, prop) => String(prop) });
export const Color = new Proxy({}, { get: (_target, prop) => String(prop) });
