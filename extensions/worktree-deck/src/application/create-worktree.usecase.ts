import { worktreeCreateService } from "../domain/worktree-create.service";

/**
 * worktree 作成で共通利用する実行コンテキスト
 */
export type WorktreeCreateContext = {
  env: NodeJS.ProcessEnv;
  homeDir: string | null;
  assetsPath: string;
  packageDir: string;
  packageName: string;
};

/**
 * worktree 作成前に解決するパス情報
 */
export type WorktreeCreatePaths = {
  scriptPath: string;
};

/**
 * worktree 作成ユースケースの入力値
 */
export type CreateWorktreeCommand = {
  repoRoot: string;
  branch: string;
  scriptPath: string;
  startPoint?: string;
  mapValue?: string;
  allowExistingWorktree?: boolean;
};

/**
 * worktree 作成ユースケースの外部実行結果
 */
export type CreateWorktreeExecutionResult = {
  stdout: string;
  stderr: string;
  createdPath?: string | null;
  reusedExisting?: boolean;
};

/**
 * worktree 作成ユースケースの依存ポート
 */
export type CreateWorktreeDependencies = {
  resolvePaths(context: WorktreeCreateContext): Promise<WorktreeCreatePaths>;
  executeCreateWorktree(command: CreateWorktreeCommand): Promise<CreateWorktreeExecutionResult>;
};

/**
 * 作成前に必要なパス情報を取得する
 */
async function resolvePaths(_args: {
  context: WorktreeCreateContext;
  dependencies: CreateWorktreeDependencies;
}): Promise<WorktreeCreatePaths> {
  return _args.dependencies.resolvePaths(_args.context);
}

/**
 * worktree 作成を実行し作成先パスを確定する
 */
async function create(_args: {
  command: CreateWorktreeCommand;
  dependencies: CreateWorktreeDependencies;
}): Promise<{ createdPath: string; stdout: string; stderr: string; reusedExisting?: boolean }> {
  const executionResult = await _args.dependencies.executeCreateWorktree(_args.command);
  const createdPath = executionResult.createdPath ?? worktreeCreateService.parseCreatedPath(executionResult.stdout);
  if (createdPath === null) {
    throw new Error("Created worktree path could not be resolved.");
  }
  return {
    createdPath,
    stdout: executionResult.stdout,
    stderr: executionResult.stderr,
    ...(executionResult.reusedExisting === true ? { reusedExisting: true } : {}),
  };
}

/**
 * worktree 作成ユースケース関数群
 */
export const createWorktreeUsecase = {
  resolvePaths,
  create,
} as const;
