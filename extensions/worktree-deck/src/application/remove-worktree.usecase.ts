import { worktreeRemoveService } from "../domain/worktree-remove.service";

/**
 * worktree 削除ユースケースの入力
 */
export type RemoveWorktreeInput = {
  repoRoot: string;
  worktreePath: string;
  assetsPath?: string;
  force?: boolean;
  branch?: string | null;
  deleteBranch?: boolean;
  deleteRemoteBranch?: boolean;
};

/**
 * worktree 削除ユースケースの返却値
 */
export type RemoveWorktreeResult = {
  stdout: string;
  stderr: string;
};

/**
 * worktree バックグラウンド削除開始結果
 */
export type StartBackgroundRemoveWorktreeResult = {
  jobId: string;
  statePath: string;
};

/**
 * worktree 削除ユースケースの依存ポート
 */
export type RemoveWorktreeDependencies = {
  validateWorktreeRemoval(args: { repoRoot: string; worktreePath: string; force?: boolean }): Promise<void>;
  startBackgroundWorktreeRemove(input: RemoveWorktreeInput): Promise<StartBackgroundRemoveWorktreeResult>;
  runWorktreeRemove(args: { repoRoot: string; worktreePath: string; force?: boolean }): Promise<RemoveWorktreeResult>;
  checkLocalBranchExists(args: { repoRoot: string; branch: string }): Promise<boolean>;
  deleteLocalBranch(args: { repoRoot: string; branch: string }): Promise<void>;
  listRemotes(args: { repoRoot: string }): Promise<string[]>;
  readGitConfigValue(args: { repoRoot: string; key: string }): Promise<string | null>;
  checkRemoteBranchExists(args: { repoRoot: string; remote: string; branch: string }): Promise<boolean>;
  deleteRemoteBranch(args: { repoRoot: string; remote: string; branch: string }): Promise<void>;
};

/**
 * worktree を削除し必要に応じてローカル/リモートブランチを削除する
 */
async function remove(args: {
  input: RemoveWorktreeInput;
  dependencies: RemoveWorktreeDependencies;
}): Promise<RemoveWorktreeResult> {
  const result = await args.dependencies.runWorktreeRemove({
    repoRoot: args.input.repoRoot,
    worktreePath: args.input.worktreePath,
    force: args.input.force,
  });
  const normalizedBranch = worktreeRemoveService.normalizeBranchName(args.input.branch);
  if (normalizedBranch === null) {
    return result;
  }
  if (args.input.deleteBranch === true) {
    const localExists = await args.dependencies.checkLocalBranchExists({
      repoRoot: args.input.repoRoot,
      branch: normalizedBranch,
    });
    if (localExists) {
      await args.dependencies.deleteLocalBranch({
        repoRoot: args.input.repoRoot,
        branch: normalizedBranch,
      });
    }
  }
  if (args.input.deleteRemoteBranch === true) {
    const remotes = await args.dependencies.listRemotes({ repoRoot: args.input.repoRoot });
    const configuredRemote = await args.dependencies.readGitConfigValue({
      repoRoot: args.input.repoRoot,
      key: `branch.${normalizedBranch}.remote`,
    });
    const remoteName = worktreeRemoveService.selectRemoteNameForDeletion({
      remotes,
      configuredRemote,
    });
    if (remoteName === null) {
      return result;
    }
    const mergeRef = await args.dependencies.readGitConfigValue({
      repoRoot: args.input.repoRoot,
      key: `branch.${normalizedBranch}.merge`,
    });
    const remoteBranch = worktreeRemoveService.resolveRemoteBranchNameFromMergeRef({
      mergeRef,
      fallbackBranch: normalizedBranch,
    });
    const remoteExists = await args.dependencies.checkRemoteBranchExists({
      repoRoot: args.input.repoRoot,
      remote: remoteName,
      branch: remoteBranch,
    });
    if (remoteExists) {
      await args.dependencies.deleteRemoteBranch({
        repoRoot: args.input.repoRoot,
        remote: remoteName,
        branch: remoteBranch,
      });
    }
  }
  return result;
}

/**
 * worktree 削除を検証後にバックグラウンド worker として開始する
 */
async function startBackgroundRemove(args: {
  input: RemoveWorktreeInput;
  dependencies: RemoveWorktreeDependencies;
}): Promise<StartBackgroundRemoveWorktreeResult> {
  await args.dependencies.validateWorktreeRemoval({
    repoRoot: args.input.repoRoot,
    worktreePath: args.input.worktreePath,
    force: args.input.force,
  });
  const normalizedBranch = worktreeRemoveService.normalizeBranchName(args.input.branch);
  return args.dependencies.startBackgroundWorktreeRemove({
    ...args.input,
    branch: normalizedBranch,
    deleteBranch: normalizedBranch !== null && args.input.deleteBranch === true,
    deleteRemoteBranch: normalizedBranch !== null && args.input.deleteRemoteBranch === true,
  });
}

/**
 * worktree 削除ユースケース関数群
 */
export const removeWorktreeUsecase = {
  remove,
  startBackgroundRemove,
} as const;
