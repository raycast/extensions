import { LocalStorage } from "@raycast/api";
import { ResearchProject } from "../types";

export const STORAGE_KEY = "research_projects";

export async function loadProjects(): Promise<ResearchProject[]> {
  const storedProjects = await LocalStorage.getItem<string>(STORAGE_KEY);
  return storedProjects ? JSON.parse(storedProjects) : [];
}

export async function saveProjects(projects: ResearchProject[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export async function deleteProject(projects: ResearchProject[], projectId: string): Promise<ResearchProject[]> {
  const updatedProjects = projects.filter((p) => p.id !== projectId);
  await saveProjects(updatedProjects);
  return updatedProjects;
}
