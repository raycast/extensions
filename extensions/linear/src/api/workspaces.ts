import { LocalStorage } from "@raycast/api";

export interface WorkspaceConfig {
  id: string;
  name: string;
  urlKey: string;
  logoUrl?: string;
  type: "oauth" | "pat";
  pat?: string;
}

const WORKSPACES_KEY = "linear-workspaces";
const ACTIVE_WORKSPACE_KEY = "linear-active-workspace";

export async function getStoredWorkspaces(): Promise<WorkspaceConfig[]> {
  const json = await LocalStorage.getItem<string>(WORKSPACES_KEY);
  return json ? JSON.parse(json) : [];
}

async function setStoredWorkspaces(workspaces: WorkspaceConfig[]): Promise<void> {
  await LocalStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
}

export async function addWorkspace(workspace: WorkspaceConfig): Promise<void> {
  const workspaces = await getStoredWorkspaces();
  const existing = workspaces.findIndex((w) => w.id === workspace.id);
  if (existing >= 0) {
    workspaces[existing] = workspace;
  } else {
    workspaces.push(workspace);
  }
  await setStoredWorkspaces(workspaces);
}

export async function removeWorkspace(workspaceId: string): Promise<void> {
  const workspaces = await getStoredWorkspaces();
  await setStoredWorkspaces(workspaces.filter((w) => w.id !== workspaceId));

  const active = await getActiveWorkspaceId();
  if (active === workspaceId) {
    await clearActiveWorkspace();
  }
}

export async function getActiveWorkspaceId(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(ACTIVE_WORKSPACE_KEY)) ?? null;
}

export async function setActiveWorkspaceId(workspaceId: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
}

export async function clearActiveWorkspace(): Promise<void> {
  await LocalStorage.removeItem(ACTIVE_WORKSPACE_KEY);
}
