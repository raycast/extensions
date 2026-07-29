import fs from "fs";
import path from "path";
import os from "os";
import type { ProjectEntity } from "../types";
import type { CustomTypeRule } from "./projectTypeDetector";
import { detectProjectType, hasGitRepo, safeReadDir } from "./projectTypeDetector";

export interface ScanOptions {
  /** Root directories to scan (already tilde-expanded, absolute paths). */
  roots: string[];
  /** Maximum directory depth to descend below each root while looking for projects. */
  maxDepth: number;
  /** Folder names to skip entirely (e.g. node_modules, .git, build). */
  excludeNames: Set<string>;
  /** Project types the user registered in "Manage App Paths", matched before the builtin rules. */
  customRules?: CustomTypeRule[];
}

/** Expands a leading `~` to the user's home directory. */
export function expandHome(inputPath: string): string {
  if (!inputPath) return inputPath;
  if (inputPath === "~") return os.homedir();
  if (inputPath.startsWith("~/") || inputPath.startsWith("~\\")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

/**
 * Conventional macOS development folder names, used when the root preference
 * is empty so a fresh install lists something without a trip to Preferences.
 */
const FALLBACK_ROOT_NAMES = ["~/Developer", "~/Development", "~/Projects", "~/Code", "~/dev"];

/** Existing directories among the conventional dev folders, used when no root is configured. */
export function detectDefaultRoots(): string[] {
  return FALLBACK_ROOT_NAMES.map(expandHome).filter(isDirectory);
}

/** Parses a comma-separated preference string into a de-duplicated, trimmed, non-empty array. */
export function parseCommaSeparated(value: string | undefined | null): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0),
    ),
  );
}

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Folders starting with "." or "_" are conventionally private/generated
 * (`.build`, `_site`, `__pycache__`) and are never project roots themselves.
 * The ".git" marker check still runs on the parent via hasGitRepo().
 */
function isHiddenFolder(name: string): boolean {
  return name.startsWith(".") || name.startsWith("_");
}

/**
 * Recursively scans a single root directory, returning every directory that
 * looks like a distinct project. Once a directory is classified as a
 * project, its children are not descended into (so a monorepo's internal
 * `node_modules`/build folders never get listed as separate projects), but
 * sibling and cousin directories continue to be explored.
 */
function scanRoot(rootPath: string, options: ScanOptions): ProjectEntity[] {
  const results: ProjectEntity[] = [];

  function walk(currentPath: string, depth: number): void {
    const entries = safeReadDir(currentPath);
    if (entries.length === 0 && depth > 0) return;

    const detection = detectProjectType(currentPath, entries, options.customRules);
    const isGit = hasGitRepo(currentPath);
    const isRecognizedProject = detection.type !== "generic" || isGit;

    if (depth > 0 && isRecognizedProject) {
      let stat: fs.Stats | undefined;
      try {
        stat = fs.statSync(currentPath);
      } catch {
        stat = undefined;
      }

      results.push({
        name: path.basename(currentPath),
        path: currentPath,
        type: detection.type,
        typeLabel: detection.label,
        lastModified: stat?.mtimeMs ?? 0,
        sourceRoot: rootPath,
        isGitRepo: isGit,
      });
      // Stop descending — this directory is already a project boundary.
      return;
    }

    if (depth >= options.maxDepth) return;

    for (const name of entries) {
      if (options.excludeNames.has(name)) continue;
      if (isHiddenFolder(name)) continue;

      const childPath = path.join(currentPath, name);
      if (!isDirectory(childPath)) continue;

      walk(childPath, depth + 1);
    }
  }

  walk(rootPath, 0);
  return results;
}

/**
 * Scans every configured root directory and returns a flattened, de-duplicated
 * list of discovered projects sorted by most-recently-modified first.
 */
export function scanForProjects(options: ScanOptions): ProjectEntity[] {
  const seenPaths = new Set<string>();
  const all: ProjectEntity[] = [];

  for (const root of options.roots) {
    if (!root) continue;
    if (!isDirectory(root)) continue;

    for (const project of scanRoot(root, options)) {
      if (seenPaths.has(project.path)) continue;
      seenPaths.add(project.path);
      all.push(project);
    }
  }

  all.sort((a, b) => b.lastModified - a.lastModified);
  return all;
}
