import { describe, expect, it, vi } from "vitest";

import {
  worktreeBaseRefUsecase,
  type LoadBaseRefDependencies,
  type SaveBaseRefDependencies,
} from "./worktree-base-ref.usecase";

/**
 * baseRef 取得ユースケース向け依存モックを作る
 */
function buildLoadDependencies(): LoadBaseRefDependencies {
  return {
    loadBranchConfigBaseRef: vi.fn(async () => null),
    loadWorktreeBaseRef: vi.fn(async () => null),
    loadBaseRefByWorktreePaths: vi.fn(async () => new Map()),
  };
}

/**
 * baseRef 保存ユースケース向け依存モックを作る
 */
function buildSaveDependencies(): SaveBaseRefDependencies {
  return {
    saveBranchConfigBaseRef: vi.fn(async () => undefined),
    saveWorktreeBaseRef: vi.fn(async () => undefined),
  };
}

describe("load", () => {
  it("branch 指定時は branch config を優先して返す", async () => {
    const dependencies = buildLoadDependencies();
    vi.mocked(dependencies.loadBranchConfigBaseRef).mockResolvedValueOnce(" origin/main ");
    vi.mocked(dependencies.loadWorktreeBaseRef).mockResolvedValueOnce(" develop ");

    await expect(
      worktreeBaseRefUsecase.load({
        query: { worktreePath: " /repo/wt ", branch: " feature/a " },
        dependencies,
      }),
    ).resolves.toEqual({
      baseRef: "origin/main",
      source: "branch-config",
    });

    expect(dependencies.loadBranchConfigBaseRef).toHaveBeenCalledWith({
      worktreePath: "/repo/wt",
      branch: "feature/a",
    });
  });

  it("branch 指定なしでは worktree storage を返す", async () => {
    const dependencies = buildLoadDependencies();
    vi.mocked(dependencies.loadWorktreeBaseRef).mockResolvedValueOnce(" release/2026.02 ");

    await expect(
      worktreeBaseRefUsecase.load({
        query: { worktreePath: " /repo/wt " },
        dependencies,
      }),
    ).resolves.toEqual({
      baseRef: "release/2026.02",
      source: "worktree-storage",
    });

    expect(dependencies.loadBranchConfigBaseRef).not.toHaveBeenCalled();
  });
});

describe("loadMap", () => {
  it("空白と重複を除いた path で一括取得する", async () => {
    const dependencies = buildLoadDependencies();

    await worktreeBaseRefUsecase.loadMap({
      query: { paths: [" /a ", "", " /a", " /b "] },
      dependencies,
    });

    expect(dependencies.loadBaseRefByWorktreePaths).toHaveBeenCalledWith(["/a", "/b"]);
  });
});

describe("save", () => {
  it("branch 指定時は branch config と storage の両方へ保存する", async () => {
    const dependencies = buildSaveDependencies();

    await worktreeBaseRefUsecase.save({
      command: {
        worktreePath: " /repo/wt ",
        branch: " feature/a ",
        baseRef: " origin/main ",
      },
      dependencies,
    });

    expect(dependencies.saveBranchConfigBaseRef).toHaveBeenCalledWith({
      worktreePath: "/repo/wt",
      branch: "feature/a",
      baseRef: "origin/main",
    });
    expect(dependencies.saveWorktreeBaseRef).toHaveBeenCalledWith({
      worktreePath: "/repo/wt",
      baseRef: "origin/main",
    });
  });

  it("branch 未指定時は storage のみへ保存する", async () => {
    const dependencies = buildSaveDependencies();

    await worktreeBaseRefUsecase.save({
      command: {
        worktreePath: " /repo/wt ",
        baseRef: " develop ",
      },
      dependencies,
    });

    expect(dependencies.saveBranchConfigBaseRef).not.toHaveBeenCalled();
    expect(dependencies.saveWorktreeBaseRef).toHaveBeenCalledWith({
      worktreePath: "/repo/wt",
      baseRef: "develop",
    });
  });
});
