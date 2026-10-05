// Runtime stub for `@raycast/api`. Only covers the surface we touch during
// unit tests (LocalStorage + a few enum-ish exports). Anything else will
// throw, making it obvious if a test accidentally depends on Raycast runtime.

const storage = new Map();

export const LocalStorage = {
  getItem: async (key) => storage.get(key),
  setItem: async (key, value) => {
    storage.set(key, value);
  },
  removeItem: async (key) => {
    storage.delete(key);
  },
  allItems: async () => Object.fromEntries(storage),
  clear: async () => {
    storage.clear();
  },
};

export const Toast = { Style: { Success: "SUCCESS", Failure: "FAILURE", Animated: "ANIMATED" } };
export const Icon = new Proxy({}, { get: (_t, prop) => String(prop) });
export const Color = new Proxy({}, { get: (_t, prop) => String(prop) });
export const environment = { supportPath: "/tmp", assetsPath: "/tmp", commandName: "test" };

export async function showToast() {}
export async function showInFinder() {}
export async function showHUD() {}
export async function getPreferenceValues() {
  return {};
}
export function openCommandPreferences() {}
export async function launchCommand() {}
export const Clipboard = { copy: async () => {} };

export function getSelectedFinderItems() {
  return Promise.resolve([]);
}

// Tool schema helpers used by AI tools (not invoked at runtime in tests).
export const Tool = {
  Confirmation: () => null,
};

export default {};
