import { LocalStorage } from "@raycast/api";

import { AppGroup, STORAGE_KEY } from "./types";

const seedGroups: AppGroup[] = [];

function normalizeLoadedGroups(groups: AppGroup[]): AppGroup[] {
  return groups.map((group) => ({
    ...group,
    apps: (group.apps ?? []).map((app: AppGroup["apps"][number] & { url?: string }) => ({
      ...app,
      target: app.target ?? app.url ?? "",
    })),
  }));
}

export async function loadGroups(): Promise<AppGroup[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return seedGroups;
  }

  try {
    const parsed = JSON.parse(raw) as AppGroup[];
    return Array.isArray(parsed) ? normalizeLoadedGroups(parsed) : seedGroups;
  } catch {
    return seedGroups;
  }
}

export async function saveGroups(groups: AppGroup[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}
