// In-memory stand-in for the parts of @raycast/api the logic modules touch
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const environment = { supportPath: mkdtempSync(join(tmpdir(), "at-profile-test-")) };

const store = new Map<string, string>();

export const LocalStorage = {
  getItem: async (key: string) => store.get(key),
  setItem: async (key: string, value: string) => {
    store.set(key, String(value));
  },
  removeItem: async (key: string) => {
    store.delete(key);
  },
  clear: async () => store.clear(),
  allItems: async () => Object.fromEntries(store),
};

export const Icon = { Globe: "globe" };
export const preferences: Record<string, unknown> = {};
export const getPreferenceValues = () => preferences;
export const Toast = { Style: { Animated: "animated", Success: "success", Failure: "failure" } };
export const Clipboard = { copy: async () => undefined };
export const showToast = async () => ({});
export const showHUD = async () => undefined;
export const open = async () => undefined;
