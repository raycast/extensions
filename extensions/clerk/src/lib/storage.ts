import { LocalStorage } from "@raycast/api";
import type { ClerkApp } from "../types";
import { pruneClientCache } from "./clerk";

const APPS_KEY = "clerk.apps";
const ACTIVE_KEY = "clerk.activeAppId";

export async function getApps(): Promise<ClerkApp[]> {
  const raw = await LocalStorage.getItem<string>(APPS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ClerkApp[];
  } catch {
    return [];
  }
}

export async function saveApps(apps: ClerkApp[]): Promise<void> {
  await LocalStorage.setItem(APPS_KEY, JSON.stringify(apps));
  pruneClientCache(apps.map((a) => a.secretKey));
}

export async function getActiveAppId(): Promise<string | undefined> {
  return await LocalStorage.getItem<string>(ACTIVE_KEY);
}

export async function setActiveAppId(id: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_KEY, id);
}

export async function addApp(app: ClerkApp): Promise<void> {
  const apps = await getApps();
  apps.push(app);
  await saveApps(apps);
  if (apps.length === 1) await setActiveAppId(app.id);
}

export async function updateApp(app: ClerkApp): Promise<void> {
  const apps = await getApps();
  await saveApps(apps.map((a) => (a.id === app.id ? app : a)));
}

export async function removeApp(id: string): Promise<void> {
  const apps = (await getApps()).filter((a) => a.id !== id);
  await saveApps(apps);
  const activeId = await getActiveAppId();
  if (activeId === id) {
    if (apps.length > 0) await setActiveAppId(apps[0].id);
    else await LocalStorage.removeItem(ACTIVE_KEY);
  }
}

export async function getActiveApp(): Promise<ClerkApp | undefined> {
  const id = await getActiveAppId();
  if (!id) return undefined;
  return (await getApps()).find((a) => a.id === id);
}
