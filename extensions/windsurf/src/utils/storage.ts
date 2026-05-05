import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { WindsurfProject } from "./types";

const STORAGE_KEY = "windsurf-projects";

export async function loadWindsurfProjects(): Promise<WindsurfProject[]> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (stored) {
      const projects = JSON.parse(stored);
      return projects.map((project: Omit<WindsurfProject, "lastOpened"> & { lastOpened: string }) => ({
        ...project,
        lastOpened: new Date(project.lastOpened),
      }));
    }
  } catch (error) {
    console.error("Error loading Windsurf projects:", error);
    await showFailureToast(error, { title: "Failed to load projects" });
  }
  return [];
}

export async function saveWindsurfProject(project: WindsurfProject): Promise<void> {
  try {
    const projects = await loadWindsurfProjects();

    // Remove existing project with same path
    const filteredProjects = projects.filter((p) => p.path !== project.path);

    // Add new project at the beginning
    const updatedProjects = [project, ...filteredProjects];

    // Keep only the last 50 projects
    const limitedProjects = updatedProjects.slice(0, 50);

    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(limitedProjects));
  } catch (error) {
    console.error("Error saving Windsurf project:", error);
    await showFailureToast(error, { title: "Failed to save project" });
    throw error; // Re-throw to allow caller to handle
  }
}

export async function removeWindsurfProject(path: string): Promise<void> {
  try {
    const projects = await loadWindsurfProjects();
    const filteredProjects = projects.filter((p) => p.path !== path);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filteredProjects));
  } catch (error) {
    console.error("Error removing Windsurf project:", error);
    await showFailureToast(error, { title: "Failed to remove project" });
    throw error; // Re-throw to allow caller to handle
  }
}
