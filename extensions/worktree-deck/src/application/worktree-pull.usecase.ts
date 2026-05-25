import { worktreePullService } from "../domain/worktree-pull.service";

/**
 * worktree pull の計画情報
 */
export type WorktreePullPlan = {
  worktreePath: string;
  branch: string;
  upstreamRef: string;
};

/**
 * worktree pull の結果情報
 */
export type WorktreePullResult = {
  branch: string;
  upstreamRef: string;
};

/**
 * worktree pull 計画作成ユースケースの依存ポート
 */
export type BuildWorktreePullPlanDependencies = {
  readCurrentBranch(worktreePath: string): Promise<string | null>;
  readUpstreamTrackingRef(worktreePath: string): Promise<string | null>;
};

/**
 * worktree pull 実行ユースケースの依存ポート
 */
export type PullWorktreeDependencies = {
  pullFromUpstream(worktreePath: string): Promise<void>;
};

/**
 * worktree pull の事前計画を組み立てる
 */
async function buildPlan(_args: {
  worktreePath: string;
  expectedBranch?: string | null;
  dependencies: BuildWorktreePullPlanDependencies;
}): Promise<WorktreePullPlan> {
  const worktreePath = _args.worktreePath.trim();
  if (!worktreePath) {
    throw new Error("Worktree path is required.");
  }

  const currentBranch = await _args.dependencies.readCurrentBranch(worktreePath);
  if (currentBranch === null) {
    throw new Error("Current branch is not available.");
  }

  const expectedBranchCandidate = _args.expectedBranch?.trim();
  const expectedBranch =
    expectedBranchCandidate !== undefined && expectedBranchCandidate.length > 0 ? expectedBranchCandidate : null;
  const branchMatched = worktreePullService.matchesExpectedBranch({
    expectedBranch,
    currentBranch,
  });
  if (!branchMatched) {
    throw new Error("Current branch does not match selected branch.");
  }

  const upstreamRef = worktreePullService.normalizeUpstreamRef(
    await _args.dependencies.readUpstreamTrackingRef(worktreePath),
  );
  if (upstreamRef === null) {
    throw new Error("Upstream branch is not configured.");
  }

  return {
    worktreePath,
    branch: currentBranch,
    upstreamRef,
  };
}

/**
 * worktree で pull を実行する
 */
async function pull(_args: {
  plan: WorktreePullPlan;
  dependencies: PullWorktreeDependencies;
}): Promise<WorktreePullResult> {
  const worktreePath = _args.plan.worktreePath.trim();
  if (!worktreePath) {
    throw new Error("Worktree path is required.");
  }

  await _args.dependencies.pullFromUpstream(worktreePath);
  return {
    branch: _args.plan.branch,
    upstreamRef: _args.plan.upstreamRef,
  };
}

/**
 * worktree pull ユースケース関数群
 */
export const worktreePullUsecase = {
  buildPlan,
  pull,
} as const;
