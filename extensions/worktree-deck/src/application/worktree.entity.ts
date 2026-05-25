import type { WorktreeTitle } from "./worktree-title.entity";

/**
 * worktree 一覧表示で扱うエンティティ
 */
export type Worktree = {
  repo: string;
  path: string;
  branch?: string;
  titleEntries?: WorktreeTitle[];
  originPath?: string;
  mergeStatus?: "synced" | "unmerged" | "dirty" | "no-commit" | "unknown";
  mergeStatusError?: string | null;
  lastCommitAt?: string | null;
  baseRef?: string | null;
  aheadCount?: number | null;
  behindCount?: number | null;
};
