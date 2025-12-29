import { List } from "@raycast/api";
import { Project } from "../types";
import { getIconForGroup, getCommandIcon } from "../constants";

// ============================================
// Project Display Utilities
// ============================================

/**
 * Format project path as subtitle, converting to relative path from home
 * and avoiding repetition with alias
 */
export function formatSubtitle(project: Project): string {
  const path = project.paths[0];
  const home = process.env.HOME || "";

  // Convert to relative path from home
  const relativePath = path.startsWith(home) ? "~" + path.slice(home.length) : path;

  // Remove the last component if it matches the alias (avoid repetition)
  const parts = relativePath.split("/");
  const lastPart = parts[parts.length - 1];

  if (lastPart.toLowerCase() === project.alias.toLowerCase()) {
    // Show parent path instead, but ensure we don't return just "~"
    const parentPath = parts.slice(0, -1).join("/");
    if (parentPath && parentPath !== "~") {
      return parentPath;
    }
  }

  return relativePath;
}

/**
 * Generate accessory items for project list display
 */
export function getAccessories(project: Project): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  // Command icon (if terminal command is set)
  const commandIcon = getCommandIcon(project.terminalCommand);
  if (commandIcon) {
    accessories.push({
      icon: commandIcon,
      tooltip: `Run: ${project.terminalCommand}`,
    });
  }

  // Favorite indicator (text only, minimal)
  if (project.isFavorite) {
    accessories.push({
      tag: { value: "★", color: "#FFD700" },
      tooltip: "Favorite",
    });
  }

  // Group icon only
  if (project.group) {
    accessories.push({
      icon: getIconForGroup(project.group, project.groupIcon),
      tooltip: `Group: ${project.group}`,
    });
  }

  // Path count (if multiple)
  if (project.paths.length > 1) {
    accessories.push({
      text: `${project.paths.length} paths`,
      tooltip: `${project.paths.length} paths`,
    });
  }

  return accessories;
}

/**
 * Get the appropriate icon path for a project based on open mode
 */
export function getProjectIconPath(project: Project): string {
  return project.openMode === "terminal" && project.terminal?.path ? project.terminal.path : project.app.path;
}

/**
 * Generate search keywords for a project
 */
export function getProjectKeywords(project: Project): string[] {
  return [project.alias, project.app.name, project.group, ...project.paths].filter(Boolean) as string[];
}
