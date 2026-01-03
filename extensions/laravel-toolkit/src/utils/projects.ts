import { LocalStorage } from "@raycast/api";

export interface Project {
  path: string;
  name: string;
  createdAt: string;
  baseKit?: string;
  packages?: string[];
}

const STORAGE_KEY = "laravel-projects";

/**
 * Get all saved Laravel projects
 */
export async function getProjects(): Promise<Project[]> {
  const json = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

/**
 * Save a new project to the list
 */
export async function saveProject(project: Project): Promise<void> {
  const projects = await getProjects();
  // Check if project already exists
  const existing = projects.findIndex((p) => p.path === project.path);
  if (existing >= 0) {
    projects[existing] = project;
  } else {
    projects.unshift(project); // Add to beginning
  }
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

/**
 * Remove a project from the list
 */
export async function removeProject(path: string): Promise<void> {
  const projects = await getProjects();
  const filtered = projects.filter((p) => p.path !== path);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Clear all projects
 */
export async function clearProjects(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
