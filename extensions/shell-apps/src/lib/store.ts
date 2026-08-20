import { LocalStorage } from "@raycast/api";
import type { ShellApp } from "./types";

const STORAGE_KEY = "shell-apps";

export async function getApps(): Promise<ShellApp[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ShellApp[]) : [];
  } catch {
    return [];
  }
}

export async function saveApps(apps: ShellApp[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

export async function getAppByName(name: string): Promise<ShellApp | undefined> {
  const apps = await getApps();
  const query = name.trim().toLowerCase();
  return apps.find((app) => app.name.toLowerCase() === query);
}

export async function upsertApp(app: ShellApp): Promise<void> {
  const apps = await getApps();
  const index = apps.findIndex((item) => item.id === app.id);
  if (index >= 0) {
    apps[index] = app;
  } else {
    apps.push(app);
  }
  await saveApps(apps);
}

export async function deleteApp(id: string): Promise<void> {
  const apps = await getApps();
  await saveApps(apps.filter((item) => item.id !== id));
}
