import type { DeletedWorktreeDependencies, DeletedWorktreeEntry } from "../application/deleted-worktrees.usecase";
import {
  checkDeletedWorktreeLocalBranchExists,
  deleteDeletedWorktree,
  loadDeletedWorktrees,
  saveDeletedWorktrees,
  saveDeletedWorktree,
} from "../infrastructure/deleted-worktree-store";

/**
 * 削除済み worktree ユースケース向け infra 入力
 */
type DeletedWorktreeInfra = {
  loadDeletedWorktrees(): Promise<DeletedWorktreeEntry[]>;
  saveDeletedWorktrees(entries: DeletedWorktreeEntry[]): Promise<void>;
  saveDeletedWorktree(entry: DeletedWorktreeEntry): Promise<void>;
  deleteDeletedWorktree(args: { repoRoot: string; branch: string }): Promise<void>;
  checkLocalBranchExists(args: { repoRoot: string; branch: string }): Promise<boolean>;
};

/**
 * 削除済み worktree ユースケース向け依存アダプタを組み立てる
 */
export function createDeletedWorktreeDependencies(infra: DeletedWorktreeInfra): DeletedWorktreeDependencies {
  return {
    loadDeletedWorktrees() {
      return infra.loadDeletedWorktrees();
    },
    saveDeletedWorktrees(entries) {
      return infra.saveDeletedWorktrees(entries);
    },
    saveDeletedWorktree(entry) {
      return infra.saveDeletedWorktree(entry);
    },
    deleteDeletedWorktree(args) {
      return infra.deleteDeletedWorktree(args);
    },
    checkLocalBranchExists(args) {
      return infra.checkLocalBranchExists(args);
    },
  };
}

/**
 * 既存 infra 実装を使った依存アダプタを生成する
 */
export function createDefaultDeletedWorktreeDependencies(): DeletedWorktreeDependencies {
  return createDeletedWorktreeDependencies({
    loadDeletedWorktrees,
    saveDeletedWorktrees,
    saveDeletedWorktree,
    deleteDeletedWorktree,
    checkLocalBranchExists: checkDeletedWorktreeLocalBranchExists,
  });
}
