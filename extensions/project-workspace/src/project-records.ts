import { loadProjectCache } from "./storage";
import { ProjectRecord, ProjectOverride, StorageState } from "./types";

export async function loadHydratedProjectCache(state: StorageState): Promise<ProjectRecord[]> {
  return hydrateCachedProjects(await loadProjectCache(), state);
}

export function hydrateCachedProjects(cachedProjects: ProjectRecord[], state: StorageState): ProjectRecord[] {
  const rootIds = new Set(state.scanRoots.map((root) => root.id));

  return cachedProjects
    .filter((project) => rootIds.has(project.rootId))
    .map((project) => applyProjectOverride(project, state.projectOverrides[project.id]));
}

function applyProjectOverride(project: ProjectRecord, override?: ProjectOverride): ProjectRecord {
  if (!override) {
    return project;
  }

  return {
    ...project,
    displayName: override.displayName ?? project.displayName,
    description: override.description ?? project.description,
    urls: override.urls ?? project.urls,
    pinned: override.pinned ?? project.pinned,
    archived: override.archived ?? project.archived,
    ideAppPath: override.ideAppPath ?? project.ideAppPath,
    terminalAppPath: override.terminalAppPath ?? project.terminalAppPath,
  };
}
