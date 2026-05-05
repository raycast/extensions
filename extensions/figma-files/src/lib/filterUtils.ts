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
 * Creates a project filter value
 */
export function createProjectFilter(teamName: string, projectName: string): string {
  return `${teamName}${SEPARATORS.TEAM_PROJECT}${projectName}`;
}

/**
 * Parses a filter value and returns the filter type and parameters
 */
export function parseFilterValue(value: string): {
  type: "all" | "team" | "project";
  teamName?: string;
  projectName?: string;
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
    const [teamName, projectName] = value.split(SEPARATORS.TEAM_PROJECT);
    return { type: "project", teamName, projectName };
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
 * Filters teams and projects to get a specific project
 */
export function filterToSpecificProject(teams: TeamFiles[], teamName: string, projectName: string): TeamFiles[] {
  const team = teams.find((t) => t.name === teamName);
  if (!team) return [];

  const project = team.files.find((p) => p.name === projectName);
  if (!project) return [];

  return [
    {
      name: teamName,
      files: [project],
    },
  ];
}
