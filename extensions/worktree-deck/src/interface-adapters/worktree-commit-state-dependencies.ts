import type {
  LoadWorktreeCommitStateStorageDependencies,
  SaveWorktreeCommitStateStorageDependencies,
} from "../application/worktree-commit-state.usecase";
import type { WorktreeCommitStateStorage } from "../domain/worktree-commit-state.service";

/**
 * commit 状態の infra 入力
 */
type WorktreeCommitStateInfra = {
  loadFromStorage(): Promise<unknown>;
  saveToStorage(storage: WorktreeCommitStateStorage): Promise<void>;
};

/**
 * commit 状態の依存アダプタを組み立てる
 */
export function createWorktreeCommitStateDependencies(
  infra: WorktreeCommitStateInfra,
): LoadWorktreeCommitStateStorageDependencies & SaveWorktreeCommitStateStorageDependencies {
  return {
    loadStorage() {
      return infra.loadFromStorage();
    },
    saveStorage(storage) {
      return infra.saveToStorage(storage);
    },
  };
}
