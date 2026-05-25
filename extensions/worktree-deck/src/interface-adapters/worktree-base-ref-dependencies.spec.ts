import { describe, expect, it, vi } from "vitest";

import {
  createLoadBaseRefDependencies,
  createSaveBaseRefDependencies,
  type WorktreeBaseRefInfra,
} from "./worktree-base-ref-dependencies";

/**
 * baseRef 用 infra モックを作る
 */
function buildInfra(): WorktreeBaseRefInfra {
  return {
    loadBranchConfigBaseRef: vi.fn(async () => "origin/main"),
    loadWorktreeBaseRef: vi.fn(async () => "develop"),
    loadBaseRefByWorktreePaths: vi.fn(async (paths) => new Map(paths.map((path) => [path, "main"]))),
    saveBranchConfigBaseRef: vi.fn(async () => undefined),
    saveWorktreeBaseRef: vi.fn(async () => undefined),
  };
}

describe("createLoadBaseRefDependencies", () => {
  it("branch config の読み取り失敗は null にフォールバックする", async () => {
    const infra = buildInfra();
    vi.mocked(infra.loadBranchConfigBaseRef).mockRejectedValueOnce(new Error("boom"));
    const dependencies = createLoadBaseRefDependencies(infra);

    await expect(
      dependencies.loadBranchConfigBaseRef({
        worktreePath: "/repo/wt",
        branch: "feature/a",
      }),
    ).resolves.toBeNull();
  });

  it("worktree storage の読み取り失敗は null にフォールバックする", async () => {
    const infra = buildInfra();
    vi.mocked(infra.loadWorktreeBaseRef).mockRejectedValueOnce(new Error("boom"));
    const dependencies = createLoadBaseRefDependencies(infra);

    await expect(dependencies.loadWorktreeBaseRef("/repo/wt")).resolves.toBeNull();
  });

  it("一括読み取り失敗は空 map にフォールバックする", async () => {
    const infra = buildInfra();
    vi.mocked(infra.loadBaseRefByWorktreePaths).mockRejectedValueOnce(new Error("boom"));
    const dependencies = createLoadBaseRefDependencies(infra);

    await expect(dependencies.loadBaseRefByWorktreePaths(["/repo/wt"])).resolves.toEqual(new Map());
  });
});

describe("createSaveBaseRefDependencies", () => {
  it("save 用依存は infra 呼び出しを委譲する", async () => {
    const infra = buildInfra();
    const dependencies = createSaveBaseRefDependencies(infra);

    await dependencies.saveBranchConfigBaseRef({
      worktreePath: "/repo/wt",
      branch: "feature/a",
      baseRef: "origin/main",
    });
    await dependencies.saveWorktreeBaseRef({
      worktreePath: "/repo/wt",
      baseRef: "origin/main",
    });

    expect(infra.saveBranchConfigBaseRef).toHaveBeenCalledWith({
      worktreePath: "/repo/wt",
      branch: "feature/a",
      baseRef: "origin/main",
    });
    expect(infra.saveWorktreeBaseRef).toHaveBeenCalledWith({
      worktreePath: "/repo/wt",
      baseRef: "origin/main",
    });
  });
});
