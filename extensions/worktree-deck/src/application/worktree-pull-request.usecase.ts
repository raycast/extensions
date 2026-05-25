import { worktreePullRequestService } from "../domain/worktree-pull-request.service";

/**
 * PR 作成計画
 */
export type WorktreePullRequestPlan = {
  repoRoot: string;
  worktreePath: string;
  baseRef: string;
  baseBranch: string;
  headBranch: string;
  remoteName: string | null;
  title: string;
  description: string;
  draft: boolean;
};

/**
 * PR 作成コマンドの実行結果
 */
export type WorktreePullRequestResult = {
  url: string | null;
  stdout: string;
  stderr: string;
};

/**
 * PR 作成実行ユースケースの結果
 */
type CreateWorktreePullRequestOutcome =
  | { status: "created"; result: WorktreePullRequestResult; messageFallback: string }
  | { status: "no-commits"; message: string }
  | { status: "remote-required" }
  | { status: "head-branch-not-on-remote"; branch: string }
  | { status: "push-failed"; error: unknown }
  | { status: "create-failed"; error: unknown };

/**
 * ヘッドブランチ解決ユースケースの依存ポート
 */
export type ResolvePullRequestHeadBranchDependencies = {
  readCurrentBranch(worktreePath: string): Promise<string | null>;
};

/**
 * PR 作成計画ユースケースの依存ポート
 */
export type BuildWorktreePullRequestPlanDependencies = {
  resolveHeadBranch(args: { worktreePath: string; headBranch?: string | null }): Promise<string | null>;
  resolveMergeTargetRef(worktreePath: string): Promise<string | null>;
  listRemotes(repoRoot: string): Promise<string[]>;
  checkLocalBranchExists(repoRoot: string, branch: string): Promise<boolean>;
};

/**
 * PR 作成実行ユースケースの依存ポート
 */
export type CreateWorktreePullRequestDependencies = {
  countCommitsBetween(args: { repoRoot: string; baseRef: string; headRef: string }): Promise<number>;
  resolvePreferredRemoteName(repoRoot: string): Promise<string | null>;
  checkRemoteBranchExists(args: { repoRoot: string; remoteName: string; branch: string }): Promise<boolean>;
  pushRemoteBranch(args: { repoRoot: string; remoteName: string; branch: string }): Promise<void>;
  createWorktreePullRequest(plan: WorktreePullRequestPlan): Promise<WorktreePullRequestResult>;
};

/**
 * PR 初期タイトル解決ユースケースの依存ポート
 */
export type ResolveWorktreePullRequestTitleDependencies = {
  resolveFirstCommitTitle(args: { repoRoot: string; baseRef: string; headRef: string }): Promise<string | null>;
};

/**
 * PR 作成に使うヘッドブランチ名を解決する
 */
async function resolveHeadBranch(args: {
  worktreePath: string;
  headBranch?: string | null;
  dependencies: ResolvePullRequestHeadBranchDependencies;
}): Promise<string | null> {
  const normalized = worktreePullRequestService.normalizeHeadBranch(args.headBranch);
  if (normalized !== null) {
    return normalized;
  }
  const detected = await args.dependencies.readCurrentBranch(args.worktreePath);
  return worktreePullRequestService.normalizeHeadBranch(detected);
}

/**
 * PR 作成の事前情報を組み立てる
 */
async function buildPlan(args: {
  repoRoot: string;
  worktreePath: string;
  baseRef?: string;
  headBranch?: string | null;
  title: string;
  description?: string;
  draft: boolean;
  dependencies: BuildWorktreePullRequestPlanDependencies;
}): Promise<WorktreePullRequestPlan> {
  const repoRoot = args.repoRoot.trim();
  if (!repoRoot) {
    throw new Error("Repository path is required.");
  }
  const worktreePath = args.worktreePath.trim();
  if (!worktreePath) {
    throw new Error("Worktree path is required.");
  }
  const title = args.title?.trim();
  if (!title) {
    throw new Error("Title is required.");
  }
  const headBranch = await args.dependencies.resolveHeadBranch({
    worktreePath,
    headBranch: args.headBranch,
  });
  if (headBranch === null) {
    throw new Error("Head branch is not available.");
  }
  const requestedBaseRef = args.baseRef?.trim() ?? "";
  const baseRef =
    requestedBaseRef.length > 0 ? requestedBaseRef : await args.dependencies.resolveMergeTargetRef(worktreePath);
  if (baseRef === null) {
    throw new Error("Base branch could not be resolved.");
  }
  const remotes = await args.dependencies.listRemotes(repoRoot);
  const remoteName = worktreePullRequestService.resolveRemoteNameFromBaseRef({ baseRef, remotes });
  const baseBranch = worktreePullRequestService.resolveBaseBranchName({ baseRef, remoteName });
  if (baseBranch === null) {
    throw new Error("Base branch could not be resolved.");
  }
  if (headBranch === baseBranch) {
    throw new Error("Base branch must be different from head branch.");
  }
  const headExists = await args.dependencies.checkLocalBranchExists(repoRoot, headBranch);
  if (!headExists) {
    throw new Error(`Head branch "${headBranch}" does not exist in repository.`);
  }
  return {
    repoRoot,
    worktreePath,
    baseRef,
    baseBranch,
    headBranch,
    remoteName,
    title,
    description: args.description?.trim() ?? "",
    draft: args.draft,
  };
}

/**
 * PR の初期タイトルを最初のコミット件名から解決する
 */
async function resolveInitialTitle(args: {
  repoRoot: string;
  baseRef: string;
  headRef: string;
  fallbackTitle: string;
  dependencies: ResolveWorktreePullRequestTitleDependencies;
}): Promise<string> {
  const fallbackTitle = args.fallbackTitle.trim();
  const baseRef = args.baseRef.trim();
  if (!baseRef) {
    return fallbackTitle;
  }
  try {
    const firstCommitTitle = await args.dependencies.resolveFirstCommitTitle({
      repoRoot: args.repoRoot,
      baseRef,
      headRef: args.headRef,
    });
    const normalizedTitle = firstCommitTitle?.trim() ?? "";
    return normalizedTitle.length > 0 ? normalizedTitle : fallbackTitle;
  } catch {
    return fallbackTitle;
  }
}

/**
 * PR を作成する
 */
async function create(args: {
  plan: WorktreePullRequestPlan;
  pushBeforeCreate: boolean;
  dependencies: CreateWorktreePullRequestDependencies;
}): Promise<CreateWorktreePullRequestOutcome> {
  const commitCount = await args.dependencies.countCommitsBetween({
    repoRoot: args.plan.repoRoot,
    baseRef: args.plan.baseRef,
    headRef: args.plan.headBranch,
  });
  if (commitCount === 0) {
    return {
      status: "no-commits",
      message: `${args.plan.baseBranch} -> ${args.plan.headBranch}`,
    };
  }

  const remoteName = args.plan.remoteName ?? (await args.dependencies.resolvePreferredRemoteName(args.plan.repoRoot));
  if (remoteName === null || remoteName.length === 0) {
    return { status: "remote-required" };
  }
  const remoteExists = await args.dependencies.checkRemoteBranchExists({
    repoRoot: args.plan.repoRoot,
    remoteName,
    branch: args.plan.headBranch,
  });
  if (!remoteExists) {
    if (!args.pushBeforeCreate) {
      return { status: "head-branch-not-on-remote", branch: args.plan.headBranch };
    }
    try {
      await args.dependencies.pushRemoteBranch({
        repoRoot: args.plan.repoRoot,
        remoteName,
        branch: args.plan.headBranch,
      });
    } catch (error) {
      return { status: "push-failed", error };
    }
  }

  try {
    const result = await args.dependencies.createWorktreePullRequest(args.plan);
    return {
      status: "created",
      result,
      messageFallback: `${args.plan.headBranch} -> ${args.plan.baseBranch}`,
    };
  } catch (error) {
    return { status: "create-failed", error };
  }
}

/**
 * worktree pull request ユースケース関数群
 */
export const worktreePullRequestUsecase = {
  create,
  resolveHeadBranch,
  resolveInitialTitle,
  buildPlan,
} as const;
