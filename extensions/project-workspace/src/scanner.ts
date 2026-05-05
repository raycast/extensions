import fs from "fs/promises";
import path from "path";

import { detectProjectFacts, isDirectoryEmpty, isIgnoredDirectoryName, isProjectDirectory } from "./detectors";
import { createStableId, normalizePath } from "./storage";
import { ProjectRecord, ScanRoot, StorageState } from "./types";

const DEFAULT_SCAN_DEPTH = 5;

export async function scanProjects(state: StorageState): Promise<ProjectRecord[]> {
  const projectsById = new Map<string, ProjectRecord>();

  for (const root of state.scanRoots.filter((scanRoot) => scanRoot.enabled)) {
    const normalizedRootPath = await normalizePath(root.path);
    const stat = await fs.stat(normalizedRootPath);

    if (!stat.isDirectory()) {
      throw new Error(`${normalizedRootPath} is not a directory`);
    }

    for (const project of await scanRoot(root, normalizedRootPath, state)) {
      projectsById.set(project.id, project);
    }
  }

  return Array.from(projectsById.values()).sort((projectA, projectB) => {
    if (projectA.pinned !== projectB.pinned) {
      return projectA.pinned ? -1 : 1;
    }

    return getProjectTitle(projectA).localeCompare(getProjectTitle(projectB));
  });
}

export function getProjectTitle(project: ProjectRecord): string {
  return project.displayName?.trim() || project.packageName || project.directoryName;
}

async function scanRoot(root: ScanRoot, normalizedRootPath: string, state: StorageState): Promise<ProjectRecord[]> {
  const projects: ProjectRecord[] = [];
  const maxDepth = root.maxDepth ?? DEFAULT_SCAN_DEPTH;

  await scanDirectory({
    directoryPath: normalizedRootPath,
    depth: 0,
    maxDepth,
    root: {
      ...root,
      path: normalizedRootPath,
    },
    projects,
    state,
  });

  return projects;
}

async function scanDirectory(options: {
  directoryPath: string;
  depth: number;
  maxDepth: number;
  root: ScanRoot;
  projects: ProjectRecord[];
  state: StorageState;
}): Promise<void> {
  const { directoryPath, depth, maxDepth, root, projects, state } = options;
  let entries: fs.Dirent[];

  try {
    entries = await fs.readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    console.warn(`Unable to scan ${directoryPath}:`, error);
    return;
  }

  const emptyDirectory = isDirectoryEmpty(entries);
  const projectDirectory = emptyDirectory || isProjectDirectory(entries);

  if (projectDirectory) {
    projects.push(await createProjectRecord(directoryPath, root, state, entries, emptyDirectory));
    return;
  }

  if (depth >= maxDepth) {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || isIgnoredDirectoryName(entry.name)) {
      continue;
    }

    const childPath = path.join(directoryPath, entry.name);

    try {
      const stat = await fs.lstat(childPath);

      if (stat.isSymbolicLink()) {
        continue;
      }
    } catch {
      continue;
    }

    await scanDirectory({
      directoryPath: childPath,
      depth: depth + 1,
      maxDepth,
      root,
      projects,
      state,
    });
  }
}

async function createProjectRecord(
  projectPath: string,
  root: ScanRoot,
  state: StorageState,
  entries: fs.Dirent[],
  isEmptyDirectory: boolean,
): Promise<ProjectRecord> {
  const normalizedProjectPath = await normalizePath(projectPath);
  const projectId = createStableId(`project:${normalizedProjectPath}`);
  const override = state.projectOverrides[projectId] ?? {};
  const facts = isEmptyDirectory
    ? {
        frameworks: [],
        languages: [],
        gitRemotes: [],
        urlsFromPackageMetadata: [],
        packageName: undefined,
      }
    : await detectProjectFacts(normalizedProjectPath, entries);

  return {
    id: projectId,
    path: normalizedProjectPath,
    rootId: root.id,
    rootPath: root.path,
    rootLabel: root.label || path.basename(root.path),
    directoryName: path.basename(normalizedProjectPath),
    packageName: facts.packageName,
    isEmptyDirectory,
    frameworks: facts.frameworks,
    languages: facts.languages,
    gitRemotes: facts.gitRemotes,
    urlsFromPackageMetadata: facts.urlsFromPackageMetadata,
    lastScannedAt: new Date().toISOString(),
    displayName: override.displayName,
    description: override.description,
    urls: override.urls ?? [],
    pinned: override.pinned ?? false,
    archived: override.archived ?? false,
    ideAppPath: override.ideAppPath,
    terminalAppPath: override.terminalAppPath,
  };
}
