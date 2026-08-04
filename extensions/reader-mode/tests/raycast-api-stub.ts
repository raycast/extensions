/**
 * Stand-in for `@raycast/api` so the parsing and detection code can be exercised outside
 * of Raycast. The extension's pure logic — fetching, cleaning, parsing, paywall detection —
 * does not need the host; only the UI layer does, and this suite does not test the UI.
 */

export const environment = {
  canAccess: () => false,
  isDevelopment: false,
  appearance: "dark" as const,
};

export const BrowserExtension = {
  getTabs: async () => [],
  getContent: async () => "",
};

export const Clipboard = {
  readText: async () => undefined,
  copy: async () => {},
};

export const LocalStorage = {
  getItem: async () => undefined,
  setItem: async () => {},
};

export const AI = {};

export const Keyboard = {
  Shortcut: { Common: { Copy: {}, Open: {}, Save: {}, Refresh: {} } },
};

export const Toast = {
  Style: { Success: "success", Failure: "failure", Animated: "animated" },
};

export async function showToast() {
  return { hide: () => {} };
}

export function getPreferenceValues() {
  return {
    skipPreCheck: true,
    enablePaywallHopper: true,
    showArticleImage: true,
    verboseLogging: false,
  };
}

export async function getSelectedText(): Promise<string> {
  throw new Error("no selection");
}
