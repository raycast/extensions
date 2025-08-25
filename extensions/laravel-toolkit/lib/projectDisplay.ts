import { basename } from "path";

/**
 * Get a user-friendly display name for a project path
 */
export function getProjectDisplayName(projectPath: string): string {
  return basename(projectPath);
}

/**
 * Get a shortened project path for display (last 2 directories)
 */
export function getProjectDisplayPath(projectPath: string): string {
  const parts = projectPath.split("/");
  if (parts.length <= 2) return projectPath;
  return ".../" + parts.slice(-2).join("/");
}

/**
 * Create a project info string for display in UI
 */
export function formatProjectInfo(projectPath: string): string {
  const name = getProjectDisplayName(projectPath);
  const path = getProjectDisplayPath(projectPath);
  return `${name} (${path})`;
}

/**
 * Create metadata about the active project for display
 */
export interface ProjectInfo {
  name: string;
  path: string;
  fullPath: string;
  displayString: string;
}

export function getProjectInfo(projectPath: string): ProjectInfo {
  return {
    name: getProjectDisplayName(projectPath),
    path: getProjectDisplayPath(projectPath),
    fullPath: projectPath,
    displayString: formatProjectInfo(projectPath),
  };
}