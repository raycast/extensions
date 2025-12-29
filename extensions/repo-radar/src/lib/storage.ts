import { LocalStorage } from "@raycast/api";
import { Project } from "../types";
import { STORAGE_KEYS } from "../constants";

// ============================================
// Storage Operations
// ============================================

export async function getProjects(): Promise<Project[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.PROJECTS);
  if (!data) return [];

  try {
    return JSON.parse(data) as Project[];
  } catch {
    return [];
  }
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

export async function getProjectById(id: string): Promise<Project | null> {
  const projects = await getProjects();
  return projects.find((p) => p.id === id) || null;
}

export async function getProjectByAlias(alias: string): Promise<Project | null> {
  const projects = await getProjects();
  const lowerAlias = alias.toLowerCase().trim();
  // Exact match first
  const exact = projects.find((p) => p.alias.toLowerCase() === lowerAlias);
  if (exact) return exact;
  // Partial match (starts with)
  return projects.find((p) => p.alias.toLowerCase().startsWith(lowerAlias)) || null;
}

// ============================================
// CRUD Operations
// ============================================

export async function addProject(project: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project> {
  const projects = await getProjects();

  const newProject: Project = {
    ...project,
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  projects.push(newProject);
  await saveProjects(projects);
  return newProject;
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, "id" | "createdAt">>,
): Promise<Project | null> {
  const projects = await getProjects();
  const index = projects.findIndex((p) => p.id === id);

  if (index === -1) return null;

  projects[index] = {
    ...projects[index],
    ...updates,
    updatedAt: Date.now(),
  };

  await saveProjects(projects);
  return projects[index];
}

export async function deleteProject(id: string): Promise<boolean> {
  const projects = await getProjects();
  const filtered = projects.filter((p) => p.id !== id);

  if (filtered.length === projects.length) return false;

  await saveProjects(filtered);
  return true;
}

// ============================================
// Favorites & Recent
// ============================================

export async function toggleFavorite(id: string): Promise<boolean> {
  const projects = await getProjects();
  const index = projects.findIndex((p) => p.id === id);

  if (index === -1) return false;

  projects[index].isFavorite = !projects[index].isFavorite;
  projects[index].updatedAt = Date.now();

  await saveProjects(projects);
  return projects[index].isFavorite ?? false;
}

export async function updateLastOpened(id: string): Promise<void> {
  const projects = await getProjects();
  const index = projects.findIndex((p) => p.id === id);

  if (index === -1) return;

  projects[index].lastOpenedAt = Date.now();
  await saveProjects(projects);
}

// ============================================
// Groups
// ============================================

export async function getGroups(): Promise<string[]> {
  const projects = await getProjects();
  const groups = projects.map((p) => p.group).filter((g): g is string => !!g);
  return [...new Set(groups)].sort();
}

export async function setProjectGroup(id: string, group: string | undefined): Promise<void> {
  const projects = await getProjects();
  const index = projects.findIndex((p) => p.id === id);

  if (index === -1) return;

  projects[index].group = group;
  projects[index].updatedAt = Date.now();

  await saveProjects(projects);
}

// ============================================
// Validation
// ============================================

export async function isAliasExists(alias: string, excludeId?: string): Promise<boolean> {
  const projects = await getProjects();
  return projects.some((p) => p.alias.toLowerCase() === alias.toLowerCase() && p.id !== excludeId);
}

// ============================================
// Helpers
// ============================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
