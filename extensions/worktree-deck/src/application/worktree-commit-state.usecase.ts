import { worktreeCommitStateService, type WorktreeCommitStateStorage } from "../domain/worktree-commit-state.service";

/**
 * commit 状態読み込みユースケースの依存ポート
 */
export type LoadWorktreeCommitStateStorageDependencies = {
  loadStorage(): Promise<unknown>;
};

/**
 * commit 状態保存ユースケースの依存ポート
 */
export type SaveWorktreeCommitStateStorageDependencies = {
  saveStorage(storage: WorktreeCommitStateStorage): Promise<void>;
};

/**
 * commit 状態を読み込む
 */
async function loadStorage(args: {
  dependencies: LoadWorktreeCommitStateStorageDependencies;
}): Promise<WorktreeCommitStateStorage> {
  const loaded = await args.dependencies.loadStorage();
  return worktreeCommitStateService.normalizeStorage(loaded);
}

/**
 * commit 状態を保存する
 */
async function saveStorage(args: {
  storage: WorktreeCommitStateStorage;
  dependencies: SaveWorktreeCommitStateStorageDependencies;
}): Promise<void> {
  const normalized = worktreeCommitStateService.normalizeStorage(args.storage);
  await args.dependencies.saveStorage(normalized);
}

/**
 * worktree commit 状態ユースケース関数群
 */
export const worktreeCommitStateUsecase = {
  loadStorage,
  saveStorage,
} as const;
