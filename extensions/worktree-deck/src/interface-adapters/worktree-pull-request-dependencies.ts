import type {
  BuildWorktreePullRequestPlanDependencies,
  ResolvePullRequestHeadBranchDependencies,
} from "../application/worktree-pull-request.usecase";
import { worktreePullRequestUsecase } from "../application/worktree-pull-request.usecase";

/**
 * worktree pull request の外部依存実装
 */
export type WorktreePullRequestInfra = {
  readCurrentBranch(worktreePath: string): Promise<string | null>;
  resolveMergeTargetRef(worktreePath: string): Promise<string | null>;
  listRemotes(repoRoot: string): Promise<string[]>;
  checkLocalBranchExists(repoRoot: string, branch: string): Promise<boolean>;
};

/**
 * ヘッドブランチ解決ユースケース向けの依存アダプタを作成する
 */
export function createResolvePullRequestHeadBranchDependencies(
  infra: WorktreePullRequestInfra,
): ResolvePullRequestHeadBranchDependencies {
  return {
    readCurrentBranch(worktreePath) {
      return infra.readCurrentBranch(worktreePath);
    },
  };
}

/**
 * PR 計画作成ユースケース向けの依存アダプタを作成する
 */
export function createBuildWorktreePullRequestPlanDependencies(
  infra: WorktreePullRequestInfra,
): BuildWorktreePullRequestPlanDependencies {
  const resolveDependencies = createResolvePullRequestHeadBranchDependencies(infra);
  return {
    resolveHeadBranch(args) {
      return worktreePullRequestUsecase.resolveHeadBranch({
        worktreePath: args.worktreePath,
        headBranch: args.headBranch,
        dependencies: resolveDependencies,
      });
    },
    resolveMergeTargetRef(worktreePath) {
      return infra.resolveMergeTargetRef(worktreePath);
    },
    listRemotes(repoRoot) {
      return infra.listRemotes(repoRoot);
    },
    checkLocalBranchExists(repoRoot, branch) {
      return infra.checkLocalBranchExists(repoRoot, branch);
    },
  };
}
