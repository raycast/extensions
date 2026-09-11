// Stands in for @raycast/api under vitest. Only the surface the tools touch.
const store = new Map<string, string>();

export const LocalStorage = {
  getItem: async <T>(key: string) => store.get(key) as T | undefined,
  setItem: async (key: string, value: string) => void store.set(key, value),
  removeItem: async (key: string) => void store.delete(key),
  clear: async () => void store.clear(),
};

export const getPreferenceValues = () => preferences;

let preferences: Record<string, string> = {};
export const __setPreferences = (next: Record<string, string>) => (preferences = next);
export const __resetStorage = () => store.clear();

const caches = new Map<string, string>();
export class Cache {
  get(key: string) {
    return caches.get(key);
  }
  set(key: string, value: string) {
    caches.set(key, value);
  }
  remove(key: string) {
    return caches.delete(key);
  }
}
export const __resetCache = () => caches.clear();

export const environment = { launchType: "userInitiated", entryPointType: "command", supportPath: "/tmp" };
export const LaunchType = { Background: "background", UserInitiated: "userInitiated" };
export const Toast = { Style: { Failure: "failure", Success: "success" } };
export const captureException = () => {};
export const popToRoot = async () => {};
export const showToast = async () => {};
