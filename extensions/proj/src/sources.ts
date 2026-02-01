import { environment } from "@raycast/api";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname, basename } from "path";
import type { SourceDirectory, EnhancedProject } from "./types";
import { findProjects, expandPath } from "./utils";
import { loadManualProjects } from "./manual-projects";

const SOURCES_FILE = join(environment.supportPath, "sources.json");

function ensureSourcesDir(): void {
  const dir = dirname(SOURCES_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function loadSources(): SourceDirectory[] {
  try {
    if (existsSync(SOURCES_FILE)) {
      const data = readFileSync(SOURCES_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    return [];
  }
  return [];
}

export function saveSources(sources: SourceDirectory[]): void {
  ensureSourcesDir();
  writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2));
}

export function addSource(
  source: Omit<SourceDirectory, "id">,
): SourceDirectory {
  const id = `src_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newSource: SourceDirectory = { ...source, id };
  const sources = loadSources();
  sources.push(newSource);
  saveSources(sources);
  return newSource;
}

export function updateSource(
  id: string,
  updates: Partial<Omit<SourceDirectory, "id">>,
): SourceDirectory | null {
  const sources = loadSources();
  const index = sources.findIndex((s) => s.id === id);
  if (index === -1) return null;
  sources[index] = { ...sources[index], ...updates };
  saveSources(sources);
  return sources[index];
}

export function deleteSource(id: string): boolean {
  const sources = loadSources();
  const filtered = sources.filter((s) => s.id !== id);
  if (filtered.length === sources.length) return false;
  saveSources(filtered);
  return true;
}

export function getSourceById(id: string): SourceDirectory | undefined {
  return loadSources().find((s) => s.id === id);
}

export function findProjectsFromAllSources(): EnhancedProject[] {
  const sources = loadSources();
  const manualProjects = loadManualProjects();
  const seenPaths = new Set<string>();
  const projects: EnhancedProject[] = [];

  // Add manual projects first (they take priority)
  for (const manual of manualProjects) {
    const normalizedPath = expandPath(manual.path);
    if (seenPaths.has(normalizedPath)) continue;
    if (!existsSync(normalizedPath)) continue;

    seenPaths.add(normalizedPath);
    projects.push({
      name: basename(normalizedPath),
      path: normalizedPath,
      relativePath: basename(normalizedPath),
      collections: manual.defaultCollection ? [manual.defaultCollection] : [],
      sourceId: manual.id,
    });
  }

  // Add projects from source directories
  for (const source of sources) {
    const found = findProjects(source.path, source.depth);

    for (const project of found) {
      const normalizedPath = expandPath(project.path);
      if (seenPaths.has(normalizedPath)) continue;
      seenPaths.add(normalizedPath);

      projects.push({
        ...project,
        collections: source.defaultCollection ? [source.defaultCollection] : [],
        sourceId: source.id,
      });
    }
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}
