import { LocalStorage, getPreferenceValues } from "@raycast/api";
import path from "path";

const SELECTED_WORKSPACE_KEY = "selected-workspace-path";

interface Preferences {
  workspacePaths?: string;
}

function normalizeWorkspacePath(workspacePath: string): string {
  const trimmed = workspacePath.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("~/")) {
    return path.join(process.env.HOME || "", trimmed.slice(2));
  }

  return trimmed;
}

function parseWorkspacePaths(rawValue?: string): string[] {
  if (!rawValue) {
    return [];
  }

  const unique = new Set<string>();
  for (const value of rawValue.split(/[\n,]+/)) {
    const normalized = normalizeWorkspacePath(value);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return [...unique];
}

export function getConfiguredWorkspaces(): string[] {
  const preferences = getPreferenceValues<Preferences>();
  return parseWorkspacePaths(preferences.workspacePaths);
}

export async function getSelectedWorkspace(): Promise<string | undefined> {
  const selected = await LocalStorage.getItem<string>(SELECTED_WORKSPACE_KEY);
  const workspaces = getConfiguredWorkspaces();

  if (!selected) {
    return workspaces[0];
  }

  return workspaces.includes(selected) ? selected : workspaces[0];
}

export async function setSelectedWorkspace(
  workspacePath: string,
): Promise<void> {
  await LocalStorage.setItem(SELECTED_WORKSPACE_KEY, workspacePath);
}

export async function getActiveWorkspaceOrThrow(): Promise<string> {
  const selected = await getSelectedWorkspace();

  if (!selected) {
    throw new Error(
      "No workspace configured. Add vault paths in extension preferences, then use Select Workspace.",
    );
  }

  return selected;
}
