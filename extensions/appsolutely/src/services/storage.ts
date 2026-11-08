import { LocalStorage } from "@raycast/api";
import { LayoutRepository } from "./state-repository.ts";
import type { StorageAdapter } from "./state-repository.ts";
import { ViewPreference } from "./view-preference.ts";
import { RecentApplications } from "./recent-applications.ts";

const storage: StorageAdapter = {
  getItem: (key) => LocalStorage.getItem<string>(key),
  setItem: (key, value) => LocalStorage.setItem(key, value),
};

export const layoutRepository = new LayoutRepository(storage);
export const viewPreference = new ViewPreference(storage);

export const recentApplicationHistory = new RecentApplications(storage);
