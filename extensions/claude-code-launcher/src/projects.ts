import { LocalStorage } from "@raycast/api";

export const PROJECTS_STORAGE_KEY = "claude-code-projects";
export const PROJECTS_CURRENT_VERSION = 1;

export interface Project {
  id: string;
  path: string;
  name?: string;
  icon?: string;
  addedAt: Date;
  lastOpened?: Date;
  openCount: number;
}

export interface ProjectsState {
  projects: Project[];
  version: number;
}

/**
 * Read-only project loader for commands that only need the saved directories.
 * Returns an empty list on missing or corrupted data without side effects;
 * corruption recovery stays in the Open Project command.
 */
export async function loadStoredProjects(): Promise<Project[]> {
  try {
    const stored = await LocalStorage.getItem<string>(PROJECTS_STORAGE_KEY);
    if (!stored) return [];

    const state: ProjectsState = JSON.parse(stored);
    if (!state.projects || !Array.isArray(state.projects)) return [];

    return state.projects.filter((proj) => proj && proj.id && proj.path);
  } catch {
    return [];
  }
}
