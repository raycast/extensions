import type {
  CreateWorktreeCommand,
  CreateWorktreeExecutionResult,
  WorktreeCreateContext,
  WorktreeCreatePaths,
} from "../application/create-worktree.usecase";
import { createWorktree, resolveRepositoryMapPaths } from "./worktree-create-store";

/**
 * worktree 作成時の repository map パス群を解決する
 */
export async function resolveRepositoryMapPathsInfra(context: WorktreeCreateContext): Promise<WorktreeCreatePaths> {
  return resolveRepositoryMapPaths(context);
}

/**
 * worktree 作成コマンドを実行する
 */
export async function createWorktreeInfra(command: CreateWorktreeCommand): Promise<CreateWorktreeExecutionResult> {
  return createWorktree(command);
}
