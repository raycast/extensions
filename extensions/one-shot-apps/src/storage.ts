import { LocalStorage } from "@raycast/api";
import { AppGroup, StoredApp } from "./types";

const GROUPS_KEY = "groups";

export async function loadGroups(): Promise<AppGroup[]> {
  const raw = await LocalStorage.getItem<string>(GROUPS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as AppGroup[];
}

export async function saveGroups(groups: AppGroup[]): Promise<void> {
  await LocalStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export async function deleteGroup(groupId: string): Promise<void> {
  const groups = await loadGroups();
  await saveGroups(groups.filter((g) => g.id !== groupId));
}

export async function addAppToGroup(groupId: string, app: StoredApp): Promise<void> {
  const groups = await loadGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  if (group.apps.some((a) => a.bundleId === app.bundleId)) return;
  group.apps.push(app);
  await saveGroups(groups);
}

export async function removeAppFromGroup(groupId: string, bundleId: string): Promise<void> {
  const groups = await loadGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  group.apps = group.apps.filter((a) => a.bundleId !== bundleId);
  await saveGroups(groups);
}
