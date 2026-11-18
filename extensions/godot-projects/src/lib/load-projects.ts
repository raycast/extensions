import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  getEngineVersion,
  getProjectDataDir,
  getRenderer,
  GODOT4_CONFIG_VERSION,
  GodotProject,
  isCSharpProject,
  isSupportedIconFile,
  parseProjectList,
  parseProjectSettings,
  ProjectListEntry,
  ProjectSettings,
  resolveResourcePath,
} from "./projects";
import { findPathInUidCache } from "./uid-cache";

export interface ProjectsResult {
  listFound: boolean;
  projects: GodotProject[];
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Adds a hint for the macOS privacy check that blocks folders like Documents or external drives. */
export function describeReadError(error: unknown): string {
  const message = errorMessage(error);
  if (errorCode(error) !== "EPERM") return message;
  return `${message}. Allow Raycast to access this folder in System Settings > Privacy & Security > Files and Folders.`;
}

async function isDirectory(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

/** Reads projects.cfg and every listed project.godot. Never writes anything. */
export async function loadProjects(projectListPath: string): Promise<ProjectsResult> {
  let text: string;
  try {
    text = await readFile(projectListPath, "utf8");
  } catch (error) {
    if (errorCode(error) === "ENOENT") return { listFound: false, projects: [] };
    throw new Error(`Could not read the Godot project list (${projectListPath}): ${describeReadError(error)}`);
  }

  let entries: ProjectListEntry[];
  try {
    entries = parseProjectList(text);
  } catch (error) {
    throw new Error(`The Godot project list (${projectListPath}) is damaged: ${errorMessage(error)}`);
  }

  return { listFound: true, projects: await Promise.all(entries.map(loadProject)) };
}

export async function loadProject(entry: ProjectListEntry): Promise<GodotProject> {
  const fallback: GodotProject = {
    path: entry.path,
    name: path.basename(entry.path) || entry.path,
    favorite: entry.favorite,
    status: "missing",
    folderExists: false,
    configVersion: 0,
    isCSharp: false,
    tags: [],
    hasImportedAssets: false,
  };

  const projectFile = path.join(entry.path, "project.godot");
  let text: string;
  let modified: number;
  try {
    [text, modified] = await Promise.all([readFile(projectFile, "utf8"), stat(projectFile).then((s) => s.mtimeMs)]);
  } catch (error) {
    const code = errorCode(error);
    if (code === "ENOENT" || code === "ENOTDIR") {
      const folderExists = await isDirectory(entry.path);
      return {
        ...fallback,
        folderExists,
        problem: folderExists ? "This folder has no project.godot file." : "This folder no longer exists.",
      };
    }
    return {
      ...fallback,
      status: "unreadable",
      folderExists: await isDirectory(entry.path),
      problem: `Could not read project.godot: ${describeReadError(error)}`,
    };
  }

  let settings: ProjectSettings;
  try {
    settings = parseProjectSettings(text);
  } catch (error) {
    return {
      ...fallback,
      status: "unreadable",
      folderExists: true,
      problem: `project.godot is damaged: ${errorMessage(error)}`,
      lastModified: modified,
    };
  }

  const dataDir = path.join(entry.path, getProjectDataDir(settings));
  const importedDir = settings.configVersion < GODOT4_CONFIG_VERSION ? dataDir : path.join(dataDir, "imported");
  const [iconPath, hasImportedAssets] = await Promise.all([
    resolveIcon(entry.path, dataDir, settings.icon),
    isDirectory(importedDir),
  ]);

  return {
    ...fallback,
    status: "ok",
    folderExists: true,
    name: settings.name ?? fallback.name,
    description: settings.description,
    configVersion: settings.configVersion,
    engineVersion: getEngineVersion(settings),
    renderer: getRenderer(settings.features),
    isCSharp: isCSharpProject(settings.features),
    tags: settings.tags,
    iconPath,
    mainScene: settings.mainScene,
    hasImportedAssets,
    lastModified: modified,
  };
}

async function resolveIcon(projectDir: string, dataDir: string, icon?: string): Promise<string | undefined> {
  if (!icon) return undefined;
  let resourcePath: string | undefined = icon;
  if (icon.startsWith("uid://")) {
    try {
      resourcePath = findPathInUidCache(await readFile(path.join(dataDir, "uid_cache.bin")), icon);
    } catch {
      return undefined;
    }
  }
  if (!resourcePath) return undefined;
  const iconPath = resolveResourcePath(projectDir, resourcePath);
  if (!iconPath || !isSupportedIconFile(iconPath)) return undefined;
  return (await isFile(iconPath)) ? iconPath : undefined;
}
