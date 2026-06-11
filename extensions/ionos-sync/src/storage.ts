import { LocalStorage } from "@raycast/api";
import { Project, StorageData, STORAGE_KEY, DATA_VERSION } from "./types";

// ─── Public API ───────────────────────────────────────────────────────────────

export async function loadProjects(): Promise<Project[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  let data: StorageData;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  return data.projects ?? [];
}

export async function saveProjects(projects: Project[]): Promise<void> {
  const data: StorageData = { version: DATA_VERSION, projects };
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function upsertProject(project: Project): Promise<Project[]> {
  const projects = await loadProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  await saveProjects(projects);
  return projects;
}

export async function deleteProject(id: string): Promise<Project[]> {
  const projects = await loadProjects();
  const updated = projects.filter((p) => p.id !== id);
  await saveProjects(updated);
  return updated;
}

export function newProjectId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
