const storage = new Map<string, string>();
let preferences: Record<string, unknown> = {};
let launchCommandImplementation: (options: unknown) => Promise<void> = async () => undefined;
const toasts: unknown[] = [];

export const Toast = {
  Style: {
    Failure: "failure",
  },
};

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

export function launchCommand(options: unknown) {
  return launchCommandImplementation(options);
}

export function showToast(options: unknown) {
  toasts.push(options);
  return Promise.resolve({});
}

export function resetRaycastMock() {
  preferences = {};
  launchCommandImplementation = async () => undefined;
  storage.clear();
  toasts.length = 0;
}

export function setMockLaunchCommand(implementation: (options: unknown) => Promise<void>) {
  launchCommandImplementation = implementation;
}

export function setMockPreferences(value: Record<string, unknown>) {
  preferences = value;
}

export function storedValue(key: string) {
  return storage.get(key);
}

export function shownToasts() {
  return toasts;
}
