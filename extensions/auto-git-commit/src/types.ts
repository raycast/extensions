import { Icon } from "@raycast/api";

export interface Repository {
  id: string;
  path: string;
  name: string;
  displayName?: string;
  branch: string;
  lastUsed: number;
  useCount: number;
  isPinned: boolean;
  hasChanges: boolean;
  changedFilesCount: number;
  lastCommit?: GitCommit;
  context?: string;
  gitStatus?: GitStatus; // Cached detailed Git status
}

export interface GitStatus {
  staged: number;
  unstaged: number;
  untracked: number;
  ahead: number;
  behind: number;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
}

export interface Preferences {
  commitMode: "AUTO" | "PREVIEW" | "QUICK";
  commitStyle: "conventional" | "simple" | "detailed";
  customInstructions?: string;
  terminalIde?: string;
  autoStageAllFiles?: boolean;
  autoPushAfterCommit?: boolean;
}

export interface ScanResult {
  repositories: Repository[];
  newCount: number;
  existingCount: number;
}

export interface CommitMessageData {
  diff: string;
  style: string;
  language?: string;
  context?: string;
  customInstructions?: string;
  repoName?: string;
  previousMessage?: string;
  regenerateInstruction?: string;
}

export interface AICommitMessage {
  message: string;
  confidence: number;
}

export enum CommitMode {
  AUTO = "AUTO",
  PREVIEW = "PREVIEW",
  QUICK = "QUICK",
}

export enum CommitStyle {
  CONVENTIONAL = "conventional",
  SIMPLE = "simple",
  DETAILED = "detailed",
}

export enum Language {
  EN = "en",
}

export const ICONS = {
  PINNED: Icon.Pin,
  CHANGES: Icon.Circle,
  CLEAN: Icon.Circle,
  FOLDER: Icon.Folder,
  GIT: Icon.Gear,
  WARNING: Icon.ExclamationMark,
  SUCCESS: Icon.Checkmark,
  ERROR: Icon.Xmark,
  INFO: Icon.Info,
  TERMINAL: Icon.Terminal,
  CODE: Icon.Code,
} as const;
