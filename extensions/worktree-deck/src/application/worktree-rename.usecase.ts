import { worktreeRenameService } from "../domain/worktree-rename.service";

/**
 * ブランチ名変更ユースケースの入力
 */
export type RenameWorktreeBranchInput = {
  repoRoot: string;
  oldBranch: string;
  newBranch: string;
  renameRemoteBranch?: boolean;
};

/**
 * ブランチ名変更ユースケースの返却値
 */
type RenameWorktreeBranchResult = {
  oldBranch: string;
  newBranch: string;
  renamedRemoteBranch: boolean;
  remoteName: string | null;
};

/**
 * ブランチ名変更ユースケースの依存ポート
 */
export type RenameWorktreeBranchDependencies = {
  renameLocalBranch(args: { repoRoot: string; oldBranch: string; newBranch: string }): Promise<void>;
  listRemotes(args: { repoRoot: string }): Promise<string[]>;
  readGitConfigValue(args: { repoRoot: string; key: string }): Promise<string | null>;
  checkRemoteBranchExists(args: { repoRoot: string; remote: string; branch: string }): Promise<boolean>;
  pushRemoteBranch(args: { repoRoot: string; remote: string; branch: string; setUpstream: boolean }): Promise<void>;
  deleteRemoteBranch(args: { repoRoot: string; remote: string; branch: string }): Promise<void>;
};

/**
 * ローカル/リモートのブランチ名変更を実行する
 */
async function rename(args: {
  input: RenameWorktreeBranchInput;
  dependencies: RenameWorktreeBranchDependencies;
}): Promise<RenameWorktreeBranchResult> {
  const repoRoot = args.input.repoRoot.trim();
  if (repoRoot.length === 0) {
    throw new Error("Repository root is required.");
  }
  const oldBranch = worktreeRenameService.normalizeBranchName(args.input.oldBranch);
  if (oldBranch === null) {
    throw new Error("Current branch is not available.");
  }
  const newBranch = worktreeRenameService.normalizeBranchName(args.input.newBranch);
  if (newBranch === null) {
    throw new Error("New branch name is required.");
  }
  if (oldBranch === newBranch) {
    throw new Error("New branch name must be different from current branch.");
  }

  let remotes: string[] = [];
  let configuredRemote: string | null = null;
  if (args.input.renameRemoteBranch === true) {
    remotes = await args.dependencies.listRemotes({ repoRoot });
    configuredRemote = await args.dependencies.readGitConfigValue({
      repoRoot,
      key: `branch.${oldBranch}.remote`,
    });
  }

  await args.dependencies.renameLocalBranch({
    repoRoot,
    oldBranch,
    newBranch,
  });

  if (args.input.renameRemoteBranch !== true) {
    return {
      oldBranch,
      newBranch,
      renamedRemoteBranch: false,
      remoteName: null,
    };
  }
  const remoteName = worktreeRenameService.selectRemoteNameForRename({
    remotes,
    configuredRemote,
  });
  if (remoteName === null) {
    return {
      oldBranch,
      newBranch,
      renamedRemoteBranch: false,
      remoteName: null,
    };
  }

  await args.dependencies.pushRemoteBranch({
    repoRoot,
    remote: remoteName,
    branch: newBranch,
    setUpstream: true,
  });
  const oldRemoteExists = await args.dependencies.checkRemoteBranchExists({
    repoRoot,
    remote: remoteName,
    branch: oldBranch,
  });
  if (oldRemoteExists) {
    await args.dependencies.deleteRemoteBranch({
      repoRoot,
      remote: remoteName,
      branch: oldBranch,
    });
  }

  return {
    oldBranch,
    newBranch,
    renamedRemoteBranch: true,
    remoteName,
  };
}

/**
 * ブランチ名変更ユースケース関数群
 */
export const worktreeRenameUsecase = {
  rename,
} as const;
