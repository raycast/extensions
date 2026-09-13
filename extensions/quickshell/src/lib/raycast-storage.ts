import { LocalStorage } from "@raycast/api";
import { getQuickShellSettingsFromPreferences } from "./extension-preferences";
import { QuickShellStorage, type StorageAdapter } from "./storage";

const raycastAdapter: StorageAdapter = {
  async getItem(key: string) {
    const value = await LocalStorage.getItem<string>(key);
    return value ?? undefined;
  },
  async setItem(key: string, value: string) {
    await LocalStorage.setItem(key, value);
  },
};

let singleton: QuickShellStorage | null = null;

export function getQuickShellStorage(): QuickShellStorage {
  if (!singleton) {
    singleton = new QuickShellStorage(raycastAdapter, getQuickShellSettingsFromPreferences);
  }
  return singleton;
}

export function resetQuickShellStorageForTests(): void {
  singleton = null;
}

export { workspaceSubtitle } from "./storage";
