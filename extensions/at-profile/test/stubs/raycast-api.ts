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
export const Image = { Mask: { RoundedRectangle: "roundedRectangle" } };
export const preferences: Record<string, unknown> = {};
export const getPreferenceValues = () => preferences;
export const Toast = { Style: { Animated: "animated", Success: "success", Failure: "failure" } };
export const Clipboard = { copy: async () => undefined };
export const showToast = async () => ({});
export const showHUD = async () => undefined;
export const open = async () => undefined;

// In-memory stand-in for Raycast's Cache, shared by every instance with the same namespace
const caches = new Map<string, Map<string, string>>();
export class Cache {
  private store: Map<string, string>;
  constructor(options: { namespace?: string } = {}) {
    const name = options.namespace ?? "";
    this.store = caches.get(name) ?? new Map();
    caches.set(name, this.store);
  }
  get(key: string) {
    return this.store.get(key);
  }
  set(key: string, data: string) {
    this.store.set(key, data);
  }
  remove(key: string) {
    return this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}
