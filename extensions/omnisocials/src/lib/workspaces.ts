import { getPreferenceValues, LocalStorage } from "@raycast/api";
import type { Preferences, WorkspaceProfile } from "./types";

const WORKSPACES_KEY = "omnisocials-workspaces";
const ACTIVE_WORKSPACE_KEY = "omnisocials-active-workspace";

export async function getWorkspaces(): Promise<WorkspaceProfile[]> {
  const raw = await LocalStorage.getItem<string>(WORKSPACES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as WorkspaceProfile[];
  } catch {
    return [];
  }
}

export async function saveWorkspaces(
  workspaces: WorkspaceProfile[],
): Promise<void> {
  await LocalStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
}

export async function addWorkspace(workspace: WorkspaceProfile): Promise<void> {
  const workspaces = await getWorkspaces();
  workspaces.push(workspace);
  await saveWorkspaces(workspaces);
  // If this is the first workspace, make it active
  if (workspaces.length === 1) {
    await setActiveWorkspaceId(workspace.id);
  }
}

export async function removeWorkspace(id: string): Promise<void> {
  const workspaces = await getWorkspaces();
  const filtered = workspaces.filter((w) => w.id !== id);
  await saveWorkspaces(filtered);
  // If we removed the active workspace, switch to first available
  const activeId = await getActiveWorkspaceId();
  if (activeId === id) {
    await setActiveWorkspaceId(filtered[0]?.id || null);
  }
}

export async function updateWorkspace(
  updated: WorkspaceProfile,
): Promise<void> {
  const workspaces = await getWorkspaces();
  const index = workspaces.findIndex((w) => w.id === updated.id);
  if (index !== -1) {
    workspaces[index] = updated;
    await saveWorkspaces(workspaces);
  }
}

export async function getActiveWorkspaceId(): Promise<string | null> {
  const id = await LocalStorage.getItem<string>(ACTIVE_WORKSPACE_KEY);
  return id || null;
}

export async function setActiveWorkspaceId(id: string | null): Promise<void> {
  if (id) {
    await LocalStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  } else {
    await LocalStorage.removeItem(ACTIVE_WORKSPACE_KEY);
  }
}

export async function getActiveWorkspace(): Promise<WorkspaceProfile | null> {
  const activeId = await getActiveWorkspaceId();
  if (!activeId) return null;
  const workspaces = await getWorkspaces();
  return workspaces.find((w) => w.id === activeId) || null;
}

const MIGRATED_KEY = "omnisocials-global-key-migrated";

/**
 * If a global API key exists in preferences and hasn't been migrated yet,
 * auto-create a "Default" workspace profile from it so it appears in the list.
 * Uses a flag so it only runs once, even if other workspaces already exist.
 */
export async function migrateGlobalApiKey(): Promise<void> {
  const alreadyMigrated = await LocalStorage.getItem<string>(MIGRATED_KEY);
  if (alreadyMigrated) return;

  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.apiKey) {
    // No global key to migrate, mark as done
    await LocalStorage.setItem(MIGRATED_KEY, "true");
    return;
  }

  // Check if this key is already in the workspace list
  const workspaces = await getWorkspaces();
  const alreadyExists = workspaces.some((w) => w.apiKey === prefs.apiKey);
  if (!alreadyExists) {
    const defaultWorkspace: WorkspaceProfile = {
      id: "migrated-default",
      name: "Default Workspace",
      apiKey: prefs.apiKey,
      icon: "🏠",
      baseUrl: undefined,
    };
    await addWorkspace(defaultWorkspace);
  }

  await LocalStorage.setItem(MIGRATED_KEY, "true");
}
