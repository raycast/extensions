import { Application } from "@raycast/api";

// Export all types from modules
export * from "./git-types";

export type GitView = "branches" | "status" | "commits" | "files" | "stashes" | "remotes" | "tags";

/**
 * User preferences for the Git Client extension.
 */
export type Preferences = {
  /** Default terminal for opening repository directory. */
  defaultTerminal: Application;
  /** External git client for git commands. */
  externalGitClient?: Application;
  /** Number of commits to load per pagination page. */
  commitsPerPage: string;
  /** Maximum number of branches to load per pagination page. */
  maxBranchesToLoad: string;
  /** Maximum number of tags to load in tags list. */
  maxTagsToLoad: string;
  /** Automatically generate a commit message using AI when opening the commit view. */
  autoGenerateCommitMessage: boolean;
};

/**
 * Configuration for URL tracking feature.
 */
export type IssueTrackerConfig = {
  /** Unique identifier for the configuration. */
  id: string;
  /** Title of the URL tracker (e.g., "Jira Ticket", "GitHub Issue"). */
  title: string;
  /** Regular expression pattern to extract components from commit messages. */
  regex: string;
  /** URL template where @key will be replaced with the regex match. */
  urlPlaceholder: string;
};

export type ListPagination = {
  pageSize: number;
  hasMore: boolean;
  onLoadMore: () => void;
};
