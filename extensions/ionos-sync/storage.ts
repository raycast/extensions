import { LocalStorage } from "@raycast/api";
import {
  Project,
  StorageData,
  STORAGE_KEY,
  DATA_VERSION,
  DEFAULT_EXCLUDES,
} from "./types";

// ─── Seed projects matching the existing ionos-sync.sh ───────────────────────

const SEED_PROJECTS: Project[] = [
  {
    id: "wdeu-de",
    name: "wdeu.de",
    localPath: "~/projects/landing-page",
    remotePath: "~/",
    deleteOnSync: false, // root-sync: never --delete
    excludes: [
      ...DEFAULT_EXCLUDES,
      "matheu",
      "calculo-mental",
      "galerie",
      "buecher",
      "img",
      "logs",
      "clickandbuilds",
      ".opcache",
      "_index.html",
      ".bash_history",
      "wp-*",
      "wdeu",
    ],
  },
  {
    id: "matheu",
    name: "matheu",
    localPath: "~/projects/matheu/dist",
    remotePath: "~/matheu",
    deleteOnSync: true,
    excludes: [...DEFAULT_EXCLUDES],
  },
  {
    id: "calculo",
    name: "calculo",
    localPath: "~/projects/calculo-mental/dist",
    remotePath: "~/calculo-mental",
    deleteOnSync: true,
    excludes: [...DEFAULT_EXCLUDES],
  },
  {
    id: "galerie",
    name: "galerie",
    localPath: "~/Downloads/galerie-output",
    remotePath: "~/buecher",
    deleteOnSync: true,
    excludes: [...DEFAULT_EXCLUDES],
  },
  {
    id: "eurobuch",
    name: "eurobuch",
    localPath: "~/projects/eurobuch",
    remotePath: "~/eurobuch",
    deleteOnSync: true,
    excludes: [...DEFAULT_EXCLUDES],
  },
  {
    id: "booq",
    name: "booq",
    localPath: "~/projects/booq/dist",
    remotePath: "~/booq",
    deleteOnSync: true,
    excludes: [...DEFAULT_EXCLUDES],
  },
];

// ─── Public API ───────────────────────────────────────────────────────────────

export async function loadProjects(): Promise<Project[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    // First run: seed with known projects
    await saveProjects(SEED_PROJECTS);
    return SEED_PROJECTS;
  }
  const data: StorageData = JSON.parse(raw);
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
