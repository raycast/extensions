/**
 * Represents a Git repository with access information.
 */
import { Action, Image } from "@raycast/api";

export interface Repository {
  /** Unique identifier for the repository. */
  id: string;
  /** The name of the repository (usually the folder name). */
  name: string;
  /** The full path to the repository. */
  path: string;
  /** Unix timestamp (ms) of the last time the repository was opened. */
  lastOpenedAt: number;
  /** Cached language detection stats for the repository. */
  languageStats?: LanguageStats[];
  /** Cloning state information if repository is being cloned. */
  cloning?: RepositoryCloningProcess;
}

/**
 * Represents the state of a repository being cloned.
 */
export interface RepositoryCloningProcess {
  /** The URL of the repository being cloned. */
  url: string;
  /** Path to the file containing stderr output. */
  stderrPath: string;
  /** Path to the file containing process PID. */
  pidPath: string;
  /** Path to the file containing exit code. */
  exitCodePath: string;
  /** Path to the script file. */
  scriptPath: string;
}

export interface RepositoryCloningState {
  output: string;
  pid: number;
  exitCode?: number;
}

/**
 * Primary programming language statistics for a repository.
 */
export interface LanguageStats {
  /** Human-friendly language name. */
  name: string;
  /** Percentage of tracked files belonging to this language. */
  percentage: number;
  /** Optional UI color to display for the language. */
  color?: Image.ImageLike;
}

/**
 * Represents a Git branch with status information.
 */
export interface Branch {
  /** The name of the branch. */
  name: string;
  /** The display name of the branch. */
  displayName: string;
  /** The type of the branch: current, local, or remote. */
  type: "current" | "local" | "remote";
  /** The upstream branch, if any. */
  upstream?: {
    /** The name of the upstream branch. */
    name: string;
    /** The display name of the upstream branch. */
    fullName: string;
    /** The remote of the upstream branch. */
    remote: string;
  };
  /** The number of commits ahead of upstream. */
  ahead?: number;
  /** The number of commits behind upstream. */
  behind?: number;
  /** Whether this branch is gone from remote. */
  isGone?: boolean;
  /** The name of the remote (for remote branches). */
  remote?: string;
  /** The message of the last commit on this branch (first line only). */
  lastCommitMessage?: string;
  /** The short hash of the last commit on this branch. */
  lastCommitHash?: string;
}

/**
 * Represents a detached HEAD state.
 */
export interface DetachedHead {
  /** The commit hash that HEAD is pointing to. */
  commitHash: string;
  /** The short commit hash. */
  shortCommitHash: string;
  /** The commit message. */
  commitMessage: string;
  /** The date of the commit. */
  commitDate: Date;
}

/**
 * Represents the current state of branches in the repository.
 */
export interface BranchesState {
  /** Current branch if checked out to a branch. */
  currentBranch?: Branch;
  /** Detached HEAD state if not on a branch. */
  detachedHead?: DetachedHead;
  /** All local branches. */
  localBranches: Branch[];
  /** All remote branches grouped by remote name. */
  remoteBranches: Record<string, Branch[]>;
}

/**
 * Represents the status of a file in a Git repository.
 */
export interface FileStatus {
  /** The full path to the file. */
  absolutePath: string;
  /** The relative path from the repository root. */
  relativePath: string;
  /** The status of the file in the working area. */
  status: "staged" | "unstaged" | "untracked";
  /** The type of change to the file. */
  type: "added" | "modified" | "deleted" | "renamed" | "copied";
  /** Whether the file is in a conflict state. */
  isConflicted: boolean;
  /** The old path (for renamed files). */
  oldPath?: string;
}

/**
 * Represents a changed file in a commit with git name-status information.
 */
export interface CommitFileChange {
  /** The status of the file change. */
  status: "added" | "modified" | "deleted" | "renamed" | "copied" | "changed";
  /** The file path. */
  path: string;
  /** The old file path (for renamed/copied files). */
  oldPath?: string;
}

/**
 * Represents a Git commit.
 */
export interface Commit {
  /** The full hash of the commit. */
  hash: string;
  /** The short hash of the commit. */
  shortHash: string;
  /** The commit message. */
  message: string;
  /** The body of the commit. */
  body: string;
  /** The author's name. */
  author: string;
  /** The author's email. */
  authorEmail: string;
  /** The date the commit was created. */
  date: Date;
  /** Local branches that contain this commit. */
  localBranches: string[];
  /** Remote branches that contain this commit. */
  remoteBranches: {
    /** The name of the remote branch. */
    name: string;
    /** The remote of the remote branch. */
    remote: string;
    /** The display name of the remote branch. */
    fullName: string;
  }[];
  /** Tags pointing to this commit. */
  tags: string[];
  /** Name of the current branch if commit is on it. */
  currentBranchName?: string;
  /** List of files changed in this commit with their status. */
  changedFiles?: CommitFileChange[];
}

/**
 * Action for a single commit in interactive rebase plan.
 */
export type RebaseAction = "pick" | "reword" | "edit" | "drop" | "squash" | "fixup";

/**
 * Describes plan item for interactive rebase execution.
 */
export interface RebasePlanItem {
  /** Commit full hash. */
  hash: string;
  /** Selected action. */
  action: RebaseAction;
  /** Optional new message for reword action (single line). */
  newMessage?: string;
}

/**
 * Represents an entry in the stash (staged changes).
 */
export interface Stash {
  /** The message associated with the stash. */
  message: string;
  /** The hash of the commit on which the stash was created. */
  hash: string;
  /** The date the stash was created. */
  date: Date;
  /** The author of the stash. */
  author: string;
  /** The author's email. */
  authorEmail: string;
}

/**
 * Known Git hosting providers.
 */
export type RemoteProvider = "GitHub" | "GitLab" | "Bitbucket" | "Azure DevOps" | "Gitea" | undefined;

export type RemoteWebPage = Action.OpenInBrowser.Props;
/**
 * Extended remote info with parser-computed properties.
 */
export type Remote = {
  name: string;
  fetchUrl: string;
  pushUrl: string;
  type: "ssh" | "http";
  organizationName?: string;
  displayName: string;
  repositoryName?: string;
  provider: RemoteProvider;
  avatarUrl?: string;
  webPages: {
    fileRelated: (filePath: string, ref?: string) => RemoteWebPage[];
    commitRelated: (commit: Pick<Commit, "hash" | "message">) => RemoteWebPage[];
    branchRelated: (branch: string) => RemoteWebPage[];
    tagRelated: (tag: string) => RemoteWebPage[];
    other: () => RemoteWebPage[];
  };
};

/**
 * Represents a Git tag.
 */
export interface Tag {
  /** The name of the tag. */
  name: string;
  /** The message associated with the tag (if any). */
  message?: string;
  /** The commit hash the tag points to. */
  commitHash: string;
  /** The date the tag was created. */
  date?: Date;
  /** The author of the tag. */
  author?: string;
  /** The author's email. */
  authorEmail?: string;
}

/**
 * Represents per-file change statistics (insertions/deletions).
 */
export interface FileChangeStats {
  /** Number of inserted lines in the file. */
  insertions: number;
  /** Number of deleted lines in the file. */
  deletions: number;
}

/**
 * Represents the state of a git conflict.
 */
export type StatusMode =
  | { kind: "regular" }
  | { kind: "rebase"; conflict: boolean; current: number; total: number }
  | { kind: "merge" }
  | { kind: "squash" }
  | { kind: "cherryPick" }
  | { kind: "revert" };

// /** The type of the conflict. */
// type: "rebase" | "merge" | "squash" | "cherryPick" | "revert";
// /** The description of the conflict. */
// description: string;
// /** The current step of the conflict resolution. */
// current: number;
// /** The total number of steps in the conflict resolution. */
// total: number;
// }

/**
 * Represents the status of the repository.
 */
export interface StatusState {
  /** The current branch name, or null if in a detached HEAD state. */
  branch: string | null;
  /** An array of file statuses. */
  files: FileStatus[];
  /** Information about an ongoing conflict, if any. */
  mode: StatusMode;
}

/**
 * Represents the mode of a merge.
 */
export enum MergeMode {
  FAST_FORWARD = "ff",
  NO_FF = "no-ff",
  SQUASH = "squash",
  NO_COMMIT = "no-commit",
}

/**
 * Represents the scope of a patch.
 */
export type PatchScope = "all" | "staged" | "unstaged" | Pick<FileStatus, "absolutePath" | "status">;

/**
 * Represents the scope of a stash.
 */
export type StashScope = "all" | "staged" | "unstaged" | { filePath: string };

/**
 * Represents a single conflict segment in a file.
 */
export interface ConflictSegment {
  /** Unique identifier for the segment. */
  id: string;
  /** Line number where the conflict starts (1-based). */
  startLine: number;
  /** Line number where the conflict ends (1-based). */
  endLine: number;
  /** Content before and after the conflict segment. */
  beforeContent: string;
  afterContent: string;
  /** Content from the current branch (HEAD). */
  current: {
    label: string;
    content: string;
  };
  /** Content from the incoming branch (merge/rebase source). */
  incoming: {
    label: string;
    content: string;
  };
  /** The resolution choice: "current", "incoming", or null if not resolved. */
  resolution: "current" | "incoming" | null;
}
