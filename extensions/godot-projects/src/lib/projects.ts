import path from "node:path";
import { getBoolean, getNumber, getString, getStringArray, parseConfigFile } from "./config-file";

/** One section of projects.cfg: `[<project folder>]` with `favorite=true|false`. */
export interface ProjectListEntry {
  path: string;
  favorite: boolean;
}

/** The values this extension reads from a project's project.godot file. */
export interface ProjectSettings {
  configVersion: number;
  name?: string;
  description?: string;
  icon?: string;
  mainScene?: string;
  features: string[];
  tags: string[];
  hiddenDataDir: boolean;
}

export type ProjectStatus = "ok" | "missing" | "unreadable";

/** A project ready for display. Plain data, so it can be cached as JSON. */
export interface GodotProject {
  path: string;
  name: string;
  favorite: boolean;
  status: ProjectStatus;
  problem?: string;
  folderExists: boolean;
  description?: string;
  configVersion: number;
  engineVersion?: string;
  renderer?: string;
  isCSharp: boolean;
  tags: string[];
  iconPath?: string;
  mainScene?: string;
  hasImportedAssets: boolean;
  lastModified?: number;
}

// Godot 4 writes config_version=5 and Godot 3.1 to 3.x wrote 4.
export const GODOT4_CONFIG_VERSION = 5;
export const GODOT3_CONFIG_VERSION = 4;

const RENDERERS = ["Forward Plus", "Mobile", "GL Compatibility"];

export function parseProjectList(text: string): ProjectListEntry[] {
  const file = parseConfigFile(text);
  const entries: ProjectListEntry[] = [];
  for (const section of file.keys()) {
    if (section === "") continue;
    entries.push({ path: section, favorite: getBoolean(file, section, "favorite") === true });
  }
  return entries;
}

export function parseProjectSettings(text: string): ProjectSettings {
  const file = parseConfigFile(text);
  const name = getString(file, "application", "config/name");
  return {
    configVersion: getNumber(file, "", "config_version") ?? 0,
    name: name ? xmlUnescape(name) : undefined,
    description: getString(file, "application", "config/description") || undefined,
    icon: getString(file, "application", "config/icon") || undefined,
    mainScene: getString(file, "application", "run/main_scene") || undefined,
    features: getStringArray(file, "application", "config/features") ?? [],
    tags: getStringArray(file, "application", "config/tags") ?? [],
    hiddenDataDir: getBoolean(file, "application", "config/use_hidden_project_data_directory") !== false,
  };
}

/** The Godot version shown for a project, the same way the Project Manager finds it. */
export function getEngineVersion(settings: Pick<ProjectSettings, "configVersion" | "features">): string | undefined {
  if (settings.configVersion === GODOT3_CONFIG_VERSION) return "3.x";
  return settings.features.find((feature) => /^\d+\.\d+/.test(feature));
}

export function getRenderer(features: string[]): string | undefined {
  return features.find((feature) => RENDERERS.includes(feature));
}

export function isCSharpProject(features: string[]): boolean {
  return features.includes("C#");
}

/** The folder Godot keeps imported assets and caches in: `.godot` (Godot 4) or `.import` (Godot 3). */
export function getProjectDataDir(settings: Pick<ProjectSettings, "configVersion" | "hiddenDataDir">): string {
  if (settings.configVersion < GODOT4_CONFIG_VERSION) return ".import";
  return settings.hiddenDataDir ? ".godot" : "godot";
}

/** Turns a `res://` path into a path on disk. Other paths are returned only when absolute. */
export function resolveResourcePath(projectDir: string, resourcePath: string): string | undefined {
  if (resourcePath.startsWith("res://")) return path.join(projectDir, resourcePath.slice("res://".length));
  if (path.isAbsolute(resourcePath)) return resourcePath;
  return undefined;
}

export function isSupportedIconFile(filePath: string): boolean {
  return /\.(png|svg)$/i.test(filePath);
}

/** Godot shows the project name with XML entities decoded, see ProjectList::load_project_data(). */
export function xmlUnescape(value: string): string {
  const named: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };
  return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|lt|gt|amp|quot|apos);/g, (entity, body: string) => {
    if (!body.startsWith("#")) return named[body];
    const code = body[1] === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
}

/** Most recently edited first, like the Project Manager's default order. Missing dates go last. */
export function compareProjects(a: GodotProject, b: GodotProject): number {
  const byDate = (b.lastModified ?? -Infinity) - (a.lastModified ?? -Infinity);
  if (byDate !== 0 && !Number.isNaN(byDate)) return byDate;
  return a.name.localeCompare(b.name);
}

export function groupProjects(projects: GodotProject[]): { favorites: GodotProject[]; others: GodotProject[] } {
  const sorted = [...projects].sort(compareProjects);
  return {
    favorites: sorted.filter((project) => project.favorite),
    others: sorted.filter((project) => !project.favorite),
  };
}

export function abbreviateHome(filePath: string, home: string): string {
  if (filePath === home) return "~";
  const prefix = home.endsWith(path.sep) ? home : home + path.sep;
  return filePath.startsWith(prefix) ? "~" + path.sep + filePath.slice(prefix.length) : filePath;
}

/** Search keywords: the folder names in the project path (below the home folder) and the project's tags. */
export function getKeywords(project: Pick<GodotProject, "path" | "tags">, home: string): string[] {
  const folders = abbreviateHome(project.path, home)
    .split(path.sep)
    .filter((part) => part !== "" && part !== "~");
  return [...new Set([...folders, ...project.tags])];
}
