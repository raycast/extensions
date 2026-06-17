// This is refering a `workspace` which is scanned from `rootSourceFolder`
export type SimplifiedWorkspace = {
  name: string;
  path: string;
  hasPackageJsonFile: boolean;
};

// Refer from `teams.json` file to define type of Team
export interface SimplifiedTeam {
  name: string;
  contributors: string[];
  project?: string;
  slack: string;
  slackChannelId: string;
  directlyResponsibleIndividual: string;
}

/**
 * This option is used to look up team data inside `teams.json` file.
 */
export interface SimplifiedTeamOptions {
  // When `shouldIgnoreCache` is true, the function always query data from file.
  shouldIgnoreCache?: boolean;
  // A `teams.json` file path. It's only required when the cached data is not available (e.g. calling it at the first time).
  // If data is cached, `teamsJsonPath` is not necessary.
  teamsJsonPath?: string;
  // a path of root workspace
  workspaceRootPath?: string;
}
