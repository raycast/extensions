import { LocalStorage } from "@raycast/api";
import { AppGroup } from "./types";
import { normalizeShortcutValue } from "./shortcut-values";

const GROUPS_KEY = "groups";

export async function loadGroups(): Promise<AppGroup[]> {
  const raw = await LocalStorage.getItem<string>(GROUPS_KEY);
  if (!raw) return [];
  return (JSON.parse(raw) as AppGroup[]).map((group) => ({
    ...group,
    startShortcut: normalizeShortcutValue(group.startShortcut),
    quitShortcut: normalizeShortcutValue(group.quitShortcut),
  }));
}

export async function saveGroups(groups: AppGroup[]): Promise<void> {
  await LocalStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export async function deleteGroup(groupId: string): Promise<void> {
  const groups = await loadGroups();
  await saveGroups(groups.filter((g) => g.id !== groupId));
}
