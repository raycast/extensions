import { LocalStorage } from "@raycast/api";
import { Drive, SortKey } from "./types";
import { isSortKey, parseEnabled, resolveEnabled } from "./prefs-core";

const ENABLED_KEY = "design-file-finder.enabledDrives.v1";
const SORT_KEY = "design-file-finder.sort.v1";
const FOLDERS_KEY = "design-file-finder.searchFolders.v1";

export async function loadEnabledDrives(drives: Drive[]): Promise<Set<string>> {
  const raw = await LocalStorage.getItem<string>(ENABLED_KEY);
  return resolveEnabled(parseEnabled(raw), drives);
}

export async function saveEnabledDrives(paths: Set<string>): Promise<void> {
  await LocalStorage.setItem(ENABLED_KEY, JSON.stringify([...paths]));
}

export async function loadSort(): Promise<SortKey> {
  const raw = await LocalStorage.getItem<string>(SORT_KEY);
  return isSortKey(raw) ? raw : "recent";
}

export async function saveSort(sort: SortKey): Promise<void> {
  await LocalStorage.setItem(SORT_KEY, sort);
}

export async function loadSearchFolders(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(FOLDERS_KEY);
  return parseEnabled(raw) ?? [];
}

export async function saveSearchFolders(folders: string[]): Promise<void> {
  await LocalStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}
