import { LocalStorage } from "@raycast/api";
import type { Workspace } from "@type/octarine";
import { findWorkspaceByName } from "@lib/workspaces";

const LAST_WORKSPACE_KEY = "octarine.last-workspace.v1";

/**
 * Reads the last workspace name from Raycast LocalStorage.
 *
 * Blank stored values return undefined.
 */
export async function getLastWorkspace(): Promise<string | undefined> {
  const value = await LocalStorage.getItem<string>(LAST_WORKSPACE_KEY);
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Stores a workspace name as the last used workspace. */
export async function saveLastWorkspace(workspaceName: string): Promise<void> {
  await LocalStorage.setItem(LAST_WORKSPACE_KEY, workspaceName);
}

/** Removes the stored last workspace name. */
export async function clearLastWorkspace(): Promise<void> {
  await LocalStorage.removeItem(LAST_WORKSPACE_KEY);
}

/**
 * Resolves a stored workspace name against indexed workspaces.
 *
 * The comparison normalizes case and whitespace.
 */
export function resolveLastWorkspace(workspaces: Workspace[], storedName: string | undefined): Workspace | undefined {
  return storedName ? findWorkspaceByName(workspaces, storedName) : undefined;
}
