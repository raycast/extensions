/**
 * Git domain types
 * Centralized definitions for Git-related operations and data structures
 */

export interface GitStatus {
  branch: string;
  behind: number;
  ahead: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  isClean: boolean;
  hasRemote: boolean;
  remoteUrl?: string;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  shortHash: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: boolean;
  tracking?: string;
  ahead?: number;
  behind?: number;
}

export interface GitRemote {
  name: string;
  url: string;
  type: "fetch" | "push";
}

export interface GitFileChange {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed" | "copied" | "untracked";
  staged: boolean;
  hunks?: GitHunk[];
}

export interface GitHunk {
  oldStart: number;
  newStart: number;
  oldLines: number;
  newLines: number;
  lines: GitLine[];
}

export interface GitLine {
  type: "context" | "addition" | "deletion";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface GitCommitOptions {
  message: string;
  author?: string;
  email?: string;
  amend?: boolean;
  signOff?: boolean;
}

export interface GitPushOptions {
  remote?: string;
  branch?: string;
  force?: boolean;
  setUpstream?: boolean;
}

export interface GitPullOptions {
  remote?: string;
  branch?: string;
  rebase?: boolean;
}

export interface GitMergeOptions {
  branch: string;
  noFastForward?: boolean;
  squash?: boolean;
}

export interface GitRebaseOptions {
  onto: string;
  interactive?: boolean;
  autosquash?: boolean;
}

export interface GitStashEntry {
  index: number;
  message: string;
  branch: string;
  timestamp: string;
}

export interface GitConfig {
  name?: string;
  email?: string;
  editor?: string;
  [key: string]: string | undefined;
}

export type GitOperation =
  | "status"
  | "add"
  | "commit"
  | "push"
  | "pull"
  | "fetch"
  | "branch"
  | "checkout"
  | "merge"
  | "rebase"
  | "stash"
  | "reset"
  | "revert"
  | "clone"
  | "init";

export interface GitOperationResult<T = unknown> {
  operation: GitOperation;
  success: boolean;
  data?: T;
  error?: string;
  stdout?: string;
  stderr?: string;
}
