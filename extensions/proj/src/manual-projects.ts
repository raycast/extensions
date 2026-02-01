import { environment } from "@raycast/api";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { ManualProject } from "./types";
import { expandPath } from "./utils";

const MANUAL_PROJECTS_FILE = join(
  environment.supportPath,
  "manual-projects.json",
);

function ensureDir(): void {
  const dir = dirname(MANUAL_PROJECTS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function loadManualProjects(): ManualProject[] {
  try {
    if (existsSync(MANUAL_PROJECTS_FILE)) {
      const data = readFileSync(MANUAL_PROJECTS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    return [];
  }
  return [];
}

export function saveManualProjects(projects: ManualProject[]): void {
  ensureDir();
  writeFileSync(MANUAL_PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

export function addManualProject(
  project: Omit<ManualProject, "id" | "addedAt">,
): ManualProject {
  const id = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newProject: ManualProject = {
    ...project,
    id,
    addedAt: Date.now(),
  };
  const projects = loadManualProjects();
  projects.push(newProject);
  saveManualProjects(projects);
  return newProject;
}

export function updateManualProject(
  id: string,
  updates: Partial<Omit<ManualProject, "id" | "addedAt">>,
): ManualProject | null {
  const projects = loadManualProjects();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;
  projects[index] = { ...projects[index], ...updates };
  saveManualProjects(projects);
  return projects[index];
}

export function deleteManualProject(id: string): boolean {
  const projects = loadManualProjects();
  const filtered = projects.filter((p) => p.id !== id);
  if (filtered.length === projects.length) return false;
  saveManualProjects(filtered);
  return true;
}

export function getManualProjectById(id: string): ManualProject | undefined {
  return loadManualProjects().find((p) => p.id === id);
}

export function getManualProjectByPath(
  path: string,
): ManualProject | undefined {
  const normalizedPath = expandPath(path);
  return loadManualProjects().find(
    (p) => expandPath(p.path) === normalizedPath,
  );
}

export function hasManualProject(path: string): boolean {
  return getManualProjectByPath(path) !== undefined;
}
