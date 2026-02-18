import { LocalStorage } from "@raycast/api";

import { App } from "@/types";
import {
  STORAGE_KEY_APP,
  STORAGE_KEY_ONBOARDING_COMPLETED,
  STORAGE_KEY_PINNED_PROJECTS,
  STORAGE_KEY_TERMINAL_APP,
  STORAGE_KEY_WORKSPACE_APPS,
  STORAGE_KEY_WORKSPACES,
} from "@/utils/constants";

export async function getStoredApp(): Promise<App | null> {
  return getStoredItem<App | null>(STORAGE_KEY_APP, null);
}

export async function getStoredOnboardingCompleted(): Promise<boolean> {
  return getStoredItem<boolean>(STORAGE_KEY_ONBOARDING_COMPLETED, false);
}

export async function getStoredPinnedProjects(): Promise<string[]> {
  return getStoredItem<string[]>(STORAGE_KEY_PINNED_PROJECTS, []);
}

export async function getStoredTerminalApp(): Promise<App | null> {
  return getStoredItem<App | null>(STORAGE_KEY_TERMINAL_APP, null);
}

export async function getStoredWorkspaces(): Promise<string[]> {
  return getStoredItem<string[]>(STORAGE_KEY_WORKSPACES, []);
}

export async function getWorkspaceApps(): Promise<Record<string, App>> {
  return getStoredItem<Record<string, App>>(STORAGE_KEY_WORKSPACE_APPS, {});
}

export async function saveStoredApp(app: App): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_APP, JSON.stringify(app));
}

export async function saveStoredPinnedProjects(paths: string[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_PINNED_PROJECTS, JSON.stringify(paths));
}

export async function saveStoredTerminalApp(app: App | null): Promise<void> {
  if (app) {
    await LocalStorage.setItem(STORAGE_KEY_TERMINAL_APP, JSON.stringify(app));
  } else {
    await LocalStorage.removeItem(STORAGE_KEY_TERMINAL_APP);
  }
}

export async function saveStoredWorkspaces(workspaces: string[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(workspaces));
}

export async function saveWorkspaceApps(workspaceApps: Record<string, App>): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_WORKSPACE_APPS, JSON.stringify(workspaceApps));
}

export async function setStoredOnboardingCompleted(completed: boolean): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_ONBOARDING_COMPLETED, JSON.stringify(completed));
}

async function getStoredItem<T>(key: string, defaultValue: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);

  try {
    return raw ? (JSON.parse(raw) as T) : defaultValue;
  } catch (error) {
    console.error(`Error parsing stored item for key "${key}":`, error);

    return defaultValue;
  }
}
