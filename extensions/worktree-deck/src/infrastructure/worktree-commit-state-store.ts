import { worktreeCommitStateUsecase } from "../application/worktree-commit-state.usecase";
import { type WorktreeCommitState, type WorktreeCommitStateStorage } from "../domain/worktree-commit-state.service";
import { createWorktreeCommitStateDependencies } from "../interface-adapters/worktree-commit-state-dependencies";
import { buildEnvLookupArgs, type EnvLookupArgs } from "./env/env-store";
import { readWorktreeDeckFileStorageJson, writeWorktreeDeckFileStorageJson } from "./storage/json-file-storage";

/**
 * package.json の name と一致させる
 */
const WORKTREE_DECK_PACKAGE_NAME = "worktree-deck";
/**
 * worktree のコミット状態を保存する storage ファイル名
 */
const WORKTREE_COMMIT_STATE_STORAGE_FILE = "worktree-commit-state.json";

export type { WorktreeCommitState };

/**
 * worktree commit 状態用の storage 引数を組み立てる
 */
function buildWorktreeCommitStateStorageArgs(): EnvLookupArgs {
  return buildEnvLookupArgs(__dirname, WORKTREE_DECK_PACKAGE_NAME);
}

/**
 * storage から worktree commit 状態を読み込む
 */
async function loadFromStorage(): Promise<unknown> {
  return readWorktreeDeckFileStorageJson<unknown>(
    buildWorktreeCommitStateStorageArgs(),
    WORKTREE_COMMIT_STATE_STORAGE_FILE,
  );
}

/**
 * worktree commit 状態を storage へ保存する
 */
async function saveToStorage(storage: WorktreeCommitStateStorage): Promise<void> {
  await writeWorktreeDeckFileStorageJson(
    buildWorktreeCommitStateStorageArgs(),
    WORKTREE_COMMIT_STATE_STORAGE_FILE,
    storage,
  );
}

/**
 * commit 状態の依存アダプタを作る
 */
function createDependencies() {
  return createWorktreeCommitStateDependencies({
    loadFromStorage,
    saveToStorage,
  });
}

/**
 * worktree commit 状態を読み込む
 */
export async function loadWorktreeCommitStateStorage(): Promise<WorktreeCommitStateStorage> {
  return worktreeCommitStateUsecase.loadStorage({
    dependencies: createDependencies(),
  });
}

/**
 * worktree commit 状態を保存する
 */
export async function saveWorktreeCommitStateStorage(storage: WorktreeCommitStateStorage): Promise<void> {
  await worktreeCommitStateUsecase.saveStorage({
    storage,
    dependencies: createDependencies(),
  });
}
