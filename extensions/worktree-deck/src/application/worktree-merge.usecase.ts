import { worktreeMergeService } from "../domain/worktree-merge.service";

/**
 * worktree マージ計画
 */
export type WorktreeMergePlan = {
  repoRoot: string;
  worktreePath: string;
  sourceBranch: string;
  targetRef: string;
  targetBranch: string;
  needsTrackingBranch: boolean;
};

/**
 * worktree マージ結果
 */
type WorktreeMergeResult = {
  sourceBranch: string;
  targetBranch: string;
  createdTargetBranch: boolean;
};

/**
 * マージ計画作成ユースケースの依存ポート
 */
export type BuildWorktreeMergePlanDependencies = {
  readCurrentBranch(worktreePath: string): Promise<string | null>;
  resolveMergeTargetRef(worktreePath: string): Promise<string | null>;
  listRemotes(repoRoot: string): Promise<string[]>;
  checkLocalBranchExists(repoRoot: string, branch: string): Promise<boolean>;
};

/**
 * マージ実行ユースケースの依存ポート
 */
export type MergeWorktreeIntoBaseDependencies = {
  checkWorktreeClean(worktreePath: string): Promise<boolean>;
  checkLocalBranchExists(repoRoot: string, branch: string): Promise<boolean>;
  readCurrentBranch(worktreePath: string): Promise<string | null>;
  createTrackingBranch(repoRoot: string, branch: string, targetRef: string): Promise<void>;
  switchBranch(repoRoot: string, branch: string): Promise<void>;
  mergeBranch(repoRoot: string, sourceBranch: string): Promise<void>;
};

/**
 * worktree マージの事前計画を組み立てる
 */
async function buildPlan(args: {
  repoRoot: string;
  worktreePath: string;
  targetRef?: string;
  dependencies: BuildWorktreeMergePlanDependencies;
}): Promise<WorktreeMergePlan> {
  const repoRoot = args.repoRoot.trim();
  if (!repoRoot) {
    throw new Error("Repository path is required.");
  }
  const worktreePath = args.worktreePath.trim();
  if (!worktreePath) {
    throw new Error("Worktree path is required.");
  }
  const sourceBranch = await args.dependencies.readCurrentBranch(worktreePath);
  if (sourceBranch === null) {
    throw new Error("Source branch is not available.");
  }
  const requestedTargetRef = args.targetRef?.trim() ?? "";
  const targetRef =
    requestedTargetRef.length > 0 ? requestedTargetRef : await args.dependencies.resolveMergeTargetRef(worktreePath);
  if (targetRef === null) {
    throw new Error("Merge target branch could not be resolved.");
  }
  const remotes = await args.dependencies.listRemotes(repoRoot);
  const remoteName = worktreeMergeService.resolveRemoteNameFromTargetRef({ targetRef, remotes });
  const targetBranch = worktreeMergeService.resolveTargetBranchName({ targetRef, remoteName });
  if (targetBranch === null) {
    throw new Error("Merge target branch could not be resolved.");
  }
  if (sourceBranch === targetBranch) {
    throw new Error("Source branch is already the target branch.");
  }
  const sourceExists = await args.dependencies.checkLocalBranchExists(repoRoot, sourceBranch);
  if (!sourceExists) {
    throw new Error(`Source branch "${sourceBranch}" does not exist in repository.`);
  }
  const targetLocalExists = await args.dependencies.checkLocalBranchExists(repoRoot, targetBranch);
  const needsTrackingBranch = worktreeMergeService.shouldCreateTrackingBranch({ remoteName, targetLocalExists });
  if (!targetLocalExists && !needsTrackingBranch) {
    throw new Error(`Target branch "${targetBranch}" does not exist locally.`);
  }
  return {
    repoRoot,
    worktreePath,
    sourceBranch,
    targetRef,
    targetBranch,
    needsTrackingBranch,
  };
}

/**
 * worktree ブランチをベースブランチへマージする
 */
async function mergeIntoBase(args: {
  plan: WorktreeMergePlan;
  dependencies: MergeWorktreeIntoBaseDependencies;
}): Promise<WorktreeMergeResult> {
  const worktreeClean = await args.dependencies.checkWorktreeClean(args.plan.worktreePath);
  if (!worktreeClean) {
    throw new Error("Worktree has uncommitted changes.");
  }
  const repoClean = await args.dependencies.checkWorktreeClean(args.plan.repoRoot);
  if (!repoClean) {
    throw new Error("Repository has uncommitted changes.");
  }

  const targetLocalExists = await args.dependencies.checkLocalBranchExists(args.plan.repoRoot, args.plan.targetBranch);
  const previousBranch = await args.dependencies.readCurrentBranch(args.plan.repoRoot);
  let createdTargetBranch = false;

  if (!targetLocalExists) {
    await args.dependencies.createTrackingBranch(args.plan.repoRoot, args.plan.targetBranch, args.plan.targetRef);
    createdTargetBranch = true;
  } else {
    await args.dependencies.switchBranch(args.plan.repoRoot, args.plan.targetBranch);
  }

  await args.dependencies.mergeBranch(args.plan.repoRoot, args.plan.sourceBranch);

  if (previousBranch !== null && previousBranch !== args.plan.targetBranch) {
    try {
      await args.dependencies.switchBranch(args.plan.repoRoot, previousBranch);
    } catch {
      // 元ブランチへ戻せない場合はそのまま継続する
    }
  }

  return {
    sourceBranch: args.plan.sourceBranch,
    targetBranch: args.plan.targetBranch,
    createdTargetBranch,
  };
}

/**
 * worktree merge ユースケース関数群
 */
export const worktreeMergeUsecase = {
  buildPlan,
  mergeIntoBase,
} as const;
