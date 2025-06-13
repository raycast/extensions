/**
 * Project management utilities
 */

import { LocalStorage } from "@raycast/api";

export const SONARQUBE_PROJECTS_STORAGE_KEY = "sonarqubeProjectsList";

/**
 * Project interface representing a SonarQube project
 */
export interface Project {
  id: string;
  name: string;
  path: string;
}

/**
 * Generate a random ID for new projects
 */
export const generateId = () => Math.random().toString(36).substring(2, 11);

/**
 * Load projects from LocalStorage
 */
export async function loadProjects(): Promise<Project[]> {
  const storedProjects = await LocalStorage.getItem(SONARQUBE_PROJECTS_STORAGE_KEY);
  if (storedProjects) {
    try {
      return JSON.parse(storedProjects) as Project[];
    } catch (e) {
      console.error("Failed to parse stored projects:", e);
      return [];
    }
  }
  return [];
}

/**
 * Save projects to LocalStorage
 */
export async function saveProjects(projects: Project[]): Promise<void> {
  await LocalStorage.setItem(SONARQUBE_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

/**
 * Save a single project to LocalStorage
 * If project with same ID exists, it will be updated, otherwise added
 */
export async function saveProject(project: Project): Promise<void> {
  const projects = await loadProjects();
  const existingIndex = projects.findIndex((p) => p.id === project.id);

  if (existingIndex >= 0) {
    // Update existing project
    projects[existingIndex] = project;
  } else {
    // Add new project
    projects.push(project);
  }

  await saveProjects(projects);
}

/**
 * Delete a project by ID
 */
export async function deleteProject(projectId: string): Promise<void> {
  const projects = await loadProjects();
  const filteredProjects = projects.filter((p) => p.id !== projectId);

  if (filteredProjects.length === projects.length) {
    throw new Error(`Project with ID ${projectId} not found`);
  }

  await saveProjects(filteredProjects);
}
