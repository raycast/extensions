import { describe, expect, it, vi } from "vitest";

import { worktreeOpenAppUsecase, type OpenWorktreeInPreferredAppDependencies } from "./worktree-open-app.usecase";

/**
 * 固定アプリ起動ユースケース向け依存モックを作る
 */
function buildDependencies(): OpenWorktreeInPreferredAppDependencies {
  return {
    openPathInConfiguredIde: vi.fn(async () => undefined),
    openPathInCodexApp: vi.fn(async () => undefined),
    openCodexThreadInApp: vi.fn(async () => undefined),
    saveOpenAppMetaForWorktreePath: vi.fn(async (_path, openApp, threadId) => ({
      openApp,
      threadId: threadId ?? null,
    })),
  };
}

describe("openPreferred", () => {
  it("Codex thread id がある場合は thread 起動前に thread id を保存する", async () => {
    const dependencies = buildDependencies();

    await expect(
      worktreeOpenAppUsecase.openPreferred({
        command: {
          worktreePath: " /repo/wt ",
          openApp: "codex-app",
          threadId: "11111111-2222-3333-4444-555555555555",
        },
        dependencies,
      }),
    ).resolves.toEqual({
      preferenceSaved: true,
      savedMeta: { openApp: "codex-app", threadId: "11111111-2222-3333-4444-555555555555" },
    });
    expect(dependencies.openCodexThreadInApp).toHaveBeenCalledWith("11111111-2222-3333-4444-555555555555");
    expect(dependencies.openPathInCodexApp).not.toHaveBeenCalled();
    expect(vi.mocked(dependencies.saveOpenAppMetaForWorktreePath).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(dependencies.openCodexThreadInApp).mock.invocationCallOrder[0],
    );
  });

  it("IDE で開く場合は起動前に thread id を渡さず固定アプリを保存する", async () => {
    const dependencies = buildDependencies();

    await worktreeOpenAppUsecase.openPreferred({
      command: { worktreePath: "/repo/wt", openApp: "zed", threadId: "11111111-2222-3333-4444-555555555555" },
      dependencies,
    });

    expect(dependencies.openPathInConfiguredIde).toHaveBeenCalledWith("/repo/wt");
    expect(dependencies.saveOpenAppMetaForWorktreePath).toHaveBeenCalledWith("/repo/wt", "zed", undefined);
    expect(vi.mocked(dependencies.saveOpenAppMetaForWorktreePath).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(dependencies.openPathInConfiguredIde).mock.invocationCallOrder[0],
    );
  });

  it("起動前の設定保存に失敗しても起動成功として返す", async () => {
    const dependencies = buildDependencies();
    vi.mocked(dependencies.saveOpenAppMetaForWorktreePath).mockRejectedValueOnce(new Error("save failed"));

    await expect(
      worktreeOpenAppUsecase.openPreferred({
        command: { worktreePath: "/repo/wt", openApp: "zed" },
        dependencies,
      }),
    ).resolves.toEqual({
      preferenceSaved: false,
      savedMeta: null,
    });
  });
});
