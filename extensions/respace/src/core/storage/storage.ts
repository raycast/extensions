import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Workspace, WorkspacesData } from "../../types/workspace";
import { CONFIG_DIR, DATA_FILE } from "./constants";

/**
 * Ensures the config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Reads workspaces from storage
 */
export function readWorkspaces(): WorkspacesData {
  ensureConfigDir();

  if (!existsSync(DATA_FILE)) {
    return { workspaces: [] };
  }

  try {
    const data = readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data) as WorkspacesData;
  } catch (error) {
    console.error("Error reading workspaces:", error);
    return { workspaces: [] };
  }
}

/**
 * Writes workspaces to storage
 */
export function writeWorkspaces(data: WorkspacesData): void {
  ensureConfigDir();

  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing workspaces:", error);
    throw error;
  }
}

/**
 * Gets all workspaces
 */
export function getAllWorkspaces(): Workspace[] {
  return readWorkspaces().workspaces;
}

/**
 * Gets a workspace by ID
 */
export function getWorkspaceById(id: string): Workspace | undefined {
  const data = readWorkspaces();
  return data.workspaces.find((w) => w.id === id);
}

/**
 * Creates a new workspace
 */
export function createWorkspace(
  workspace: Omit<Workspace, "id" | "createdAt" | "updatedAt">,
): Workspace {
  const data = readWorkspaces();
  const now = new Date().toISOString();
  const newWorkspace: Workspace = {
    ...workspace,
    id: `workspace-${randomUUID()}`,
    createdAt: now,
    updatedAt: now,
  };

  data.workspaces.push(newWorkspace);
  writeWorkspaces(data);

  return newWorkspace;
}

/**
 * Updates an existing workspace
 */
export function updateWorkspace(
  id: string,
  updates: Partial<Omit<Workspace, "id" | "createdAt">>,
): Workspace | null {
  const data = readWorkspaces();
  const index = data.workspaces.findIndex((w) => w.id === id);

  if (index === -1) {
    return null;
  }

  const updatedWorkspace: Workspace = {
    ...data.workspaces[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  data.workspaces[index] = updatedWorkspace;
  writeWorkspaces(data);

  return updatedWorkspace;
}

/**
 * Deletes a workspace
 */
export function deleteWorkspace(id: string): boolean {
  const data = readWorkspaces();
  const index = data.workspaces.findIndex((w) => w.id === id);

  if (index === -1) {
    return false;
  }

  data.workspaces.splice(index, 1);
  writeWorkspaces(data);

  return true;
}

/**
 * Duplicates an existing workspace with a new name
 */
export function duplicateWorkspace(id: string): Workspace | null {
  const workspace = getWorkspaceById(id);

  if (!workspace) {
    return null;
  }

  // Create new items with fresh IDs
  const duplicatedItems = workspace.items.map((item) => ({
    ...item,
    id: `item-${randomUUID()}`,
  }));

  return createWorkspace({
    name: `${workspace.name} (Copy)`,
    description: workspace.description,
    icon: workspace.icon,
    items: duplicatedItems,
  });
}
