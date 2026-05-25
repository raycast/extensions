import type {
  CreateWorktreeCommand,
  CreateWorktreeDependencies,
  CreateWorktreeExecutionResult,
  WorktreeCreateContext,
  WorktreeCreatePaths,
} from "../application/create-worktree.usecase";
import { createWorktreeInfra, resolveRepositoryMapPathsInfra } from "../infrastructure/create-worktree-infra";

/**
 * worktree 作成ユースケース向け infra 入力
 */
type WorktreeCreateInfra = {
  resolveRepositoryMapPaths(context: WorktreeCreateContext): Promise<WorktreeCreatePaths>;
  createWorktree(command: CreateWorktreeCommand): Promise<CreateWorktreeExecutionResult>;
};

/**
 * worktree 作成ユースケース向け依存アダプタを組み立てる
 */
export function createWorktreeDependencies(infra: WorktreeCreateInfra): CreateWorktreeDependencies {
  return {
    resolvePaths(context) {
      return infra.resolveRepositoryMapPaths(context);
    },
    executeCreateWorktree(command) {
      return infra.createWorktree(command);
    },
  };
}

/**
 * 既存 infra 実装を使った依存アダプタを生成する
 */
export function createDefaultWorktreeDependencies(): CreateWorktreeDependencies {
  return createWorktreeDependencies({
    resolveRepositoryMapPaths: resolveRepositoryMapPathsInfra,
    createWorktree: createWorktreeInfra,
  });
}
