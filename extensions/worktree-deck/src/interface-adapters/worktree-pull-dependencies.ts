import type { BuildWorktreePullPlanDependencies, PullWorktreeDependencies } from "../application/worktree-pull.usecase";

/**
 * worktree pull の外部依存実装
 */
export type WorktreePullInfra = {
  readCurrentBranch(worktreePath: string): Promise<string | null>;
  readUpstreamTrackingRef(worktreePath: string): Promise<string | null>;
  pullFromUpstream(worktreePath: string): Promise<void>;
};

/**
 * 計画作成ユースケース向けの依存アダプタを作成する
 */
export function createBuildWorktreePullPlanDependencies(infra: WorktreePullInfra): BuildWorktreePullPlanDependencies {
  return {
    readCurrentBranch(worktreePath) {
      return infra.readCurrentBranch(worktreePath);
    },
    readUpstreamTrackingRef(worktreePath) {
      return infra.readUpstreamTrackingRef(worktreePath);
    },
  };
}

/**
 * pull 実行ユースケース向けの依存アダプタを作成する
 */
export function createPullWorktreeDependencies(infra: WorktreePullInfra): PullWorktreeDependencies {
  return {
    pullFromUpstream(worktreePath) {
      return infra.pullFromUpstream(worktreePath);
    },
  };
}
