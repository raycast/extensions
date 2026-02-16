import { LocalStorage } from "@raycast/api";
import {
  STORAGE_KEY_WORKSPACES,
  STORAGE_KEY_APP,
  STORAGE_KEY_WORKSPACE_APPS,
  STORAGE_KEY_WALKTHROUGH_COMPLETED,
  STORAGE_KEY_PINNED_PROJECTS,
} from "./constants";
import { App } from "../types";

export async function getStoredPinnedProjects(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY_PINNED_PROJECTS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveStoredPinnedProjects(paths: string[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_PINNED_PROJECTS, JSON.stringify(paths));
}

export async function getStoredWorkspaces(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY_WORKSPACES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveStoredWorkspaces(workspaces: string[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(workspaces));
}

export async function getStoredApp(): Promise<App | null> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY_APP);
  return raw ? JSON.parse(raw) : null;
}

export async function saveStoredApp(app: App): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_APP, JSON.stringify(app));
}

export async function getWorkspaceApps(): Promise<Record<string, App>> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY_WORKSPACE_APPS);
  return raw ? JSON.parse(raw) : {};
}

export async function saveWorkspaceApps(workspaceApps: Record<string, App>): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_WORKSPACE_APPS, JSON.stringify(workspaceApps));
}

export async function getStoredWalkthroughCompleted(): Promise<boolean> {
  const raw = await LocalStorage.getItem<boolean>(STORAGE_KEY_WALKTHROUGH_COMPLETED);
  return raw ?? false;
}

export async function setStoredWalkthroughCompleted(completed: boolean): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_WALKTHROUGH_COMPLETED, completed);
}
