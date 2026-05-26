import { existsSync } from "fs";
import { homedir } from "os";
import { dirname, normalize } from "path";

import type { AppPreferences } from "../preferences";
import type { NormalizedProject, ProjectEntry } from "../types";

const REMOTE_PREFIXES = ["vscode-remote://", "vscode-vfs://"];

function normalizeSeparators(projectPath: string): string {
  return process.platform === "win32"
    ? projectPath.replace(/\//g, "\\")
    : projectPath.replace(/\\/g, "/");
}

export function expandHomePath(projectPath: string): string {
  const normalized = normalizeSeparators(projectPath.trim());

  if (normalized === "~") {
    return homedir();
  }

  if (normalized.startsWith("~/")) {
    return normalize(`${homedir()}${normalized.slice(1)}`);
  }

  if (/^\$home(\/|$)/i.test(normalized)) {
    return normalize(`${homedir()}${normalized.slice("$home".length)}`);
  }

  return normalize(normalized);
}

export function isRemoteProjectPath(projectPath: string): boolean {
  return REMOTE_PREFIXES.some((prefix) => projectPath.startsWith(prefix));
}

function getProjectPath(entry: ProjectEntry): string | undefined {
  return (
    entry.rootPath?.trim() ||
    entry.paths?.find((projectPath) => projectPath.trim().length > 0)?.trim()
  );
}

export function normalizeProject(
  entry: ProjectEntry,
  preferences: AppPreferences,
): NormalizedProject | undefined {
  const name = entry.name?.trim();
  const projectPath = getProjectPath(entry);

  if (!name || !projectPath) {
    return undefined;
  }

  const enabled = entry.enabled ?? true;
  if (preferences.hideProjectsNotEnabled && !enabled) {
    return undefined;
  }

  const tags = Array.isArray(entry.tags)
    ? entry.tags.filter((tag) => typeof tag === "string" && tag.trim())
    : [];
  if (preferences.hideProjectsWithoutTag && tags.length === 0) {
    return undefined;
  }

  const isRemote = isRemoteProjectPath(projectPath);
  const rootPath = isRemote ? projectPath : expandHomePath(projectPath);
  const isWorkspaceFile =
    !isRemote && rootPath.toLowerCase().endsWith(".code-workspace");
  const cwd = isWorkspaceFile ? dirname(rootPath) : rootPath;

  return {
    id: entry.id || rootPath,
    name,
    rootPath,
    cwd,
    tags,
    enabled,
    isRemote,
    exists: isRemote ? false : existsSync(cwd),
    isWorkspaceFile,
  };
}
