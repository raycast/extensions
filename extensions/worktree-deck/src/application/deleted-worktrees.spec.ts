import { describe, expect, it, vi } from "vitest";

import {
  deletedWorktreesUsecase,
  type DeletedWorktreeDependencies,
  type DeletedWorktreeEntry,
} from "./deleted-worktrees.usecase";

/**
 * テスト用の削除済み worktree を作成する
 */
function buildEntry(args: Partial<DeletedWorktreeEntry> = {}): DeletedWorktreeEntry {
  return {
    repoRoot: args.repoRoot ?? "/repos/app",
    repoName: args.repoName ?? "app",
    worktreePath: args.worktreePath ?? "/worktrees/app~_~feature-a",
    branch: args.branch ?? "feature/a",
    baseRef: args.baseRef ?? "main",
    mapValue: args.mapValue ?? "app",
    openApp: args.openApp ?? "zed",
    removedAt: args.removedAt ?? "2026-05-14T00:00:00.000Z",
  };
}

/**
 * テスト用の依存ポートを作成する
 */
function buildDependencies(entries: DeletedWorktreeEntry[] = []): DeletedWorktreeDependencies {
  return {
    loadDeletedWorktrees: vi.fn(async () => entries),
    saveDeletedWorktrees: vi.fn(async () => undefined),
    saveDeletedWorktree: vi.fn(async () => undefined),
    deleteDeletedWorktree: vi.fn(async () => undefined),
    checkLocalBranchExists: vi.fn(async () => true),
  };
}

describe("recordDeletedWorktree", () => {
  it("ブランチが残る削除は復元候補として保存する", async () => {
    const dependencies = buildDependencies();

    await deletedWorktreesUsecase.recordDeletedWorktree({
      input: {
        repoRoot: "/repos/app",
        repoName: "app",
        worktreePath: "/worktrees/app~_~feature-a",
        branch: " feature/a ",
        baseRef: "main",
        mapValue: "app",
        openApp: "codex-app",
        deleteBranch: false,
      },
      dependencies,
      now: () => new Date("2026-05-14T01:02:03.000Z"),
    });

    expect(dependencies.saveDeletedWorktree).toHaveBeenCalledWith({
      repoRoot: "/repos/app",
      repoName: "app",
      worktreePath: "/worktrees/app~_~feature-a",
      branch: "feature/a",
      baseRef: "main",
      mapValue: "app",
      openApp: "codex-app",
      removedAt: "2026-05-14T01:02:03.000Z",
    });
  });

  it("ブランチ削除を選んだ削除は復元候補として保存しない", async () => {
    const dependencies = buildDependencies();

    await deletedWorktreesUsecase.recordDeletedWorktree({
      input: {
        repoRoot: "/repos/app",
        repoName: "app",
        worktreePath: "/worktrees/app~_~feature-a",
        branch: "feature/a",
        deleteBranch: true,
      },
      dependencies,
    });

    expect(dependencies.saveDeletedWorktree).not.toHaveBeenCalled();
  });
});

describe("listRestorableDeletedWorktrees", () => {
  it("ローカルブランチが存在する削除履歴だけを新しい順で返す", async () => {
    const entries = [
      buildEntry({ branch: "feature/old", removedAt: "2026-05-13T00:00:00.000Z" }),
      buildEntry({ branch: "feature/missing", removedAt: "2026-05-14T00:00:00.000Z" }),
      buildEntry({ branch: "feature/new", removedAt: "2026-05-15T00:00:00.000Z" }),
    ];
    const dependencies = buildDependencies(entries);
    vi.mocked(dependencies.checkLocalBranchExists).mockImplementation(
      async ({ branch }) => branch !== "feature/missing",
    );

    const result = await deletedWorktreesUsecase.listRestorableDeletedWorktrees({ dependencies });

    expect(result.map((entry) => entry.branch)).toEqual(["feature/new", "feature/old"]);
    expect(dependencies.checkLocalBranchExists).toHaveBeenCalledWith({
      repoRoot: "/repos/app",
      branch: "feature/missing",
    });
  });

  it("同じリポジトリとブランチの履歴は最新だけを返す", async () => {
    const entries = [
      buildEntry({ worktreePath: "/worktrees/old", branch: "feature/a", removedAt: "2026-05-13T00:00:00.000Z" }),
      buildEntry({ worktreePath: "/worktrees/new", branch: "feature/a", removedAt: "2026-05-14T00:00:00.000Z" }),
    ];
    const dependencies = buildDependencies(entries);

    const result = await deletedWorktreesUsecase.listRestorableDeletedWorktrees({ dependencies });

    expect(result).toHaveLength(1);
    expect(result[0]?.worktreePath).toBe("/worktrees/new");
  });

  it("30日以上前の削除履歴は保存先から削除して復元候補に出さない", async () => {
    const freshEntry = buildEntry({ branch: "feature/fresh", removedAt: "2026-04-15T00:00:01.000Z" });
    const expiredEntry = buildEntry({ branch: "feature/expired", removedAt: "2026-04-15T00:00:00.000Z" });
    const dependencies = buildDependencies([freshEntry, expiredEntry]);

    const result = await deletedWorktreesUsecase.listRestorableDeletedWorktrees({
      dependencies,
      now: () => new Date("2026-05-15T00:00:00.000Z"),
    });

    expect(result.map((entry) => entry.branch)).toEqual(["feature/fresh"]);
    expect(dependencies.saveDeletedWorktrees).toHaveBeenCalledWith([freshEntry]);
    expect(dependencies.checkLocalBranchExists).toHaveBeenCalledTimes(1);
  });

  it("不正な削除日時の履歴は保存先から削除して復元候補に出さない", async () => {
    const freshEntry = buildEntry({ branch: "feature/fresh", removedAt: "2026-05-14T00:00:00.000Z" });
    const invalidEntry = buildEntry({ branch: "feature/invalid", removedAt: "invalid" });
    const dependencies = buildDependencies([freshEntry, invalidEntry]);

    const result = await deletedWorktreesUsecase.listRestorableDeletedWorktrees({
      dependencies,
      now: () => new Date("2026-05-15T00:00:00.000Z"),
    });

    expect(result.map((entry) => entry.branch)).toEqual(["feature/fresh"]);
    expect(dependencies.saveDeletedWorktrees).toHaveBeenCalledWith([freshEntry]);
  });

  it("期限切れ履歴がない場合は保存先を書き換えない", async () => {
    const entry = buildEntry({ removedAt: "2026-05-14T00:00:00.000Z" });
    const dependencies = buildDependencies([entry]);

    await deletedWorktreesUsecase.listRestorableDeletedWorktrees({
      dependencies,
      now: () => new Date("2026-05-15T00:00:00.000Z"),
    });

    expect(dependencies.saveDeletedWorktrees).not.toHaveBeenCalled();
  });
});

describe("forgetDeletedWorktree", () => {
  it("復元済みの削除履歴を repoRoot と branch で削除する", async () => {
    const dependencies = buildDependencies();

    await deletedWorktreesUsecase.forgetDeletedWorktree({
      input: { repoRoot: "/repos/app", branch: " feature/a " },
      dependencies,
    });

    expect(dependencies.deleteDeletedWorktree).toHaveBeenCalledWith({
      repoRoot: "/repos/app",
      branch: "feature/a",
    });
  });
});
