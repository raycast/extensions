import { LocalStorage } from "@raycast/api";

export interface Workspace {
  id: string;
  name: string;
  projects: string[]; // Array of project paths
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "ghostty-workspaces";

export async function getWorkspaces(): Promise<Workspace[]> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  const workspaces = await getWorkspaces();
  const existingIndex = workspaces.findIndex((w) => w.id === workspace.id);

  if (existingIndex >= 0) {
    workspaces[existingIndex] = { ...workspace, updatedAt: Date.now() };
  } else {
    workspaces.push(workspace);
  }

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
}

export async function deleteWorkspace(id: string): Promise<void> {
  const workspaces = await getWorkspaces();
  const filtered = workspaces.filter((w) => w.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function createWorkspace(
  name: string,
  projects: string[],
): Promise<Workspace> {
  const workspace: Workspace = {
    id: generateId(),
    name,
    projects,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveWorkspace(workspace);
  return workspace;
}

function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
