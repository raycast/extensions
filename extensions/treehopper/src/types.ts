export interface RepoConfig {
  name: string;
  defaultBranch: string;
  hotfixBranch?: string;
}

export interface Worktree {
  path: string;
  branch: string;
  repoName: string;
  isRoot: boolean;
}

export interface Preferences {
  reposDirectory: string;
  autoDiscover: boolean;
  repositories: string;
  editor: string;
  terminal: "terminal" | "iterm" | "warp";
}
