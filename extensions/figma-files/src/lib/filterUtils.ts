import type { TeamFiles } from "../types";

// Constants for filter types and separators
export const FILTER_TYPES = {
  ALL: "All",
  TEAM: "team",
  PROJECT: "project",
} as const;

export const SEPARATORS = {
  KEY_VALUE: "=",
  TEAM_PROJECT: "&$%",
} as const;

/**
 * Creates a team filter value
 */
export function createTeamFilter(teamName: string): string {
  return `${FILTER_TYPES.TEAM}${SEPARATORS.KEY_VALUE}${teamName}`;
}

/**
 * Creates a folder filter value
 */
export function createProjectFilter(teamName: string, folderId: string): string {
  return `${teamName}${SEPARATORS.TEAM_PROJECT}${folderId}`;
}

/**
 * Parses a filter value and returns the filter type and parameters
 */
export function parseFilterValue(value: string): {
  type: "all" | "team" | "project";
  teamName?: string;
  folderId?: string;
} {
  if (value === FILTER_TYPES.ALL) {
    return { type: "all" };
  }

  if (value.includes(SEPARATORS.KEY_VALUE)) {
    const [prefix, teamName] = value.split(SEPARATORS.KEY_VALUE);
    if (prefix === FILTER_TYPES.TEAM) {
      return { type: "team", teamName };
    }
  }

  if (value.includes(SEPARATORS.TEAM_PROJECT)) {
    const [teamName, folderId] = value.split(SEPARATORS.TEAM_PROJECT);
    return { type: "project", teamName, folderId };
  }

  // Fallback for unknown formats
  return { type: "all" };
}

/**
 * Filters teams by name
 */
export function filterTeamsByName(teams: TeamFiles[], teamName: string): TeamFiles[] {
  return teams.filter((team) => team.name === teamName);
}

/**
 * Filters teams down to a specific folder and its subfolders
 */
export function filterToSpecificProject(teams: TeamFiles[], teamName: string, folderId: string): TeamFiles[] {
  const team = teams.find((t) => t.name === teamName);
  if (!team) return [];

  const included = new Set([folderId]);
  // Folders are ordered parent-first, so one pass collects every descendant
  const folders = team.folders.filter((folder) => {
    if (included.has(folder.id) || (folder.parentId && included.has(folder.parentId))) {
      included.add(folder.id);
      return true;
    }
    return false;
  });
  if (folders.length === 0) return [];

  return [{ ...team, folders }];
}
