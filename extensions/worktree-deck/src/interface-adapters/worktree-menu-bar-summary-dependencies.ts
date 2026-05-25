import type { WorktreeMenuBarSummarySnapshot } from "../domain/worktree-menu-bar-summary.service";
import {
  loadStoredWorktreeMenuBarSummary,
  saveStoredWorktreeMenuBarSummary,
} from "../infrastructure/worktree-menu-bar-summary-store";

/**
 * worktree status メニューバー summary の永続化依存
 */
export type WorktreeMenuBarSummaryStore = {
  loadLastSummary(): Promise<WorktreeMenuBarSummarySnapshot | null>;
  saveLastSummary(snapshot: WorktreeMenuBarSummarySnapshot): Promise<void>;
};

/**
 * worktree status メニューバー summary の既定依存を作る
 */
export function createDefaultWorktreeMenuBarSummaryStore(): WorktreeMenuBarSummaryStore {
  return {
    loadLastSummary: loadStoredWorktreeMenuBarSummary,
    saveLastSummary: saveStoredWorktreeMenuBarSummary,
  };
}
