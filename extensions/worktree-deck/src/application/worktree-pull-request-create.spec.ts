import { describe, expect, it, vi } from "vitest";

import {
  worktreePullRequestUsecase,
  type CreateWorktreePullRequestDependencies,
  type WorktreePullRequestPlan,
} from "./worktree-pull-request.usecase";

/**
 * PR 作成実行ユースケース向け依存モックを作る
 */
function buildDependencies(): CreateWorktreePullRequestDependencies {
  return {
    countCommitsBetween: vi.fn(async () => 1),
    resolvePreferredRemoteName: vi.fn(async () => "origin"),
    checkRemoteBranchExists: vi.fn(async () => true),
    pushRemoteBranch: vi.fn(async () => undefined),
    createWorktreePullRequest: vi.fn(async () => ({ url: "https://example.com/pr/1", stdout: "", stderr: "" })),
  };
}

/**
 * PR 作成計画を作る
 */
function buildPlan(overrides: Partial<WorktreePullRequestPlan> = {}): WorktreePullRequestPlan {
  return {
    repoRoot: "/repo",
    worktreePath: "/repo/wt",
    baseRef: "origin/main",
    baseBranch: "main",
    headBranch: "feature/a",
    remoteName: "origin",
    title: "Add feature",
    description: "",
    draft: false,
    ...overrides,
  };
}

describe("create", () => {
  it("差分コミットがない場合は PR を作成しない", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.countCommitsBetween).mockResolvedValueOnce(0);

    await expect(
      worktreePullRequestUsecase.create({
        plan: buildPlan(),
        pushBeforeCreate: true,
        dependencies,
      }),
    ).resolves.toEqual({
      status: "no-commits",
      message: "main -> feature/a",
    });
    expect(dependencies.createWorktreePullRequest).not.toHaveBeenCalled();
  });

  it("計画に remoteName がなければ優先 remote を解決して使う", async () => {
    const dependencies = buildDependencies();

    await worktreePullRequestUsecase.create({
      plan: buildPlan({ remoteName: null }),
      pushBeforeCreate: false,
      dependencies,
    });

    expect(dependencies.resolvePreferredRemoteName).toHaveBeenCalledWith("/repo");
    expect(dependencies.checkRemoteBranchExists).toHaveBeenCalledWith({
      repoRoot: "/repo",
      remoteName: "origin",
      branch: "feature/a",
    });
  });

  it("remote に head branch がなく push しない設定なら作成しない", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.checkRemoteBranchExists).mockResolvedValueOnce(false);

    await expect(
      worktreePullRequestUsecase.create({
        plan: buildPlan(),
        pushBeforeCreate: false,
        dependencies,
      }),
    ).resolves.toEqual({
      status: "head-branch-not-on-remote",
      branch: "feature/a",
    });
    expect(dependencies.pushRemoteBranch).not.toHaveBeenCalled();
    expect(dependencies.createWorktreePullRequest).not.toHaveBeenCalled();
  });

  it("remote に head branch がなく push する設定なら push 後に作成する", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.checkRemoteBranchExists).mockResolvedValueOnce(false);

    await expect(
      worktreePullRequestUsecase.create({
        plan: buildPlan(),
        pushBeforeCreate: true,
        dependencies,
      }),
    ).resolves.toMatchObject({
      status: "created",
      messageFallback: "feature/a -> main",
    });
    expect(dependencies.pushRemoteBranch).toHaveBeenCalledWith({
      repoRoot: "/repo",
      remoteName: "origin",
      branch: "feature/a",
    });
    expect(dependencies.createWorktreePullRequest).toHaveBeenCalledWith(buildPlan());
  });
});

describe("resolveInitialTitle", () => {
  it("最初のコミット件名を初期タイトルに使う", async () => {
    const resolveFirstCommitTitle = vi.fn(async () => " First commit ");

    await expect(
      worktreePullRequestUsecase.resolveInitialTitle({
        repoRoot: "/repo",
        baseRef: "origin/main",
        headRef: "feature/a",
        fallbackTitle: "feature/a",
        dependencies: { resolveFirstCommitTitle },
      }),
    ).resolves.toBe("First commit");
  });

  it("取得に失敗した場合は fallback を返す", async () => {
    const resolveFirstCommitTitle = vi.fn(async () => {
      throw new Error("git failed");
    });

    await expect(
      worktreePullRequestUsecase.resolveInitialTitle({
        repoRoot: "/repo",
        baseRef: "origin/main",
        headRef: "feature/a",
        fallbackTitle: "feature/a",
        dependencies: { resolveFirstCommitTitle },
      }),
    ).resolves.toBe("feature/a");
  });
});
