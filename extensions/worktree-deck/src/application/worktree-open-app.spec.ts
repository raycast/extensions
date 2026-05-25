import { describe, expect, it, vi } from "vitest";

import { worktreeOpenAppUsecase } from "./worktree-open-app.usecase";

describe("worktreeOpenAppUsecase", () => {
  it("未保存の worktree は Zed として読み込む", async () => {
    const result = await worktreeOpenAppUsecase.load({
      query: { worktreePath: "/worktrees/app-a" },
      dependencies: {
        loadWorktreeOpenApp: vi.fn(async () => null),
        loadOpenAppByWorktreePaths: vi.fn(async () => new Map()),
        saveWorktreeOpenApp: vi.fn(async () => undefined),
        openPathInConfiguredIde: vi.fn(async () => undefined),
        openPathInCodexApp: vi.fn(async () => undefined),
      },
    });

    expect(result.openApp).toBe("zed");
  });

  it("選択したアプリを保存する", async () => {
    const saveWorktreeOpenApp = vi.fn(async () => undefined);

    await worktreeOpenAppUsecase.save({
      command: { worktreePath: "/worktrees/app-a", openApp: "codex-app" },
      dependencies: {
        loadWorktreeOpenApp: vi.fn(async () => null),
        loadOpenAppByWorktreePaths: vi.fn(async () => new Map()),
        saveWorktreeOpenApp,
        openPathInConfiguredIde: vi.fn(async () => undefined),
        openPathInCodexApp: vi.fn(async () => undefined),
      },
    });

    expect(saveWorktreeOpenApp).toHaveBeenCalledWith({
      worktreePath: "/worktrees/app-a",
      openApp: "codex-app",
    });
  });

  it("Codex App が選択されている場合は Codex App で開く", async () => {
    const openPathInConfiguredIde = vi.fn(async () => undefined);
    const openPathInCodexApp = vi.fn(async () => undefined);

    await worktreeOpenAppUsecase.open({
      command: { worktreePath: "/worktrees/app-a", openApp: "codex-app" },
      dependencies: {
        loadWorktreeOpenApp: vi.fn(async () => null),
        loadOpenAppByWorktreePaths: vi.fn(async () => new Map()),
        saveWorktreeOpenApp: vi.fn(async () => undefined),
        openPathInConfiguredIde,
        openPathInCodexApp,
      },
    });

    expect(openPathInCodexApp).toHaveBeenCalledWith("/worktrees/app-a");
    expect(openPathInConfiguredIde).not.toHaveBeenCalled();
  });

  it("CA で開き直したら固定アプリとして保存する", async () => {
    const openPathInCodexApp = vi.fn(async () => undefined);
    const saveOpenAppMetaForWorktreePath = vi.fn(async () => ({ openApp: "codex-app" as const, threadId: null }));

    const result = await worktreeOpenAppUsecase.openPreferred({
      command: { worktreePath: "/worktrees/app-a", openApp: "codex-app", threadId: null },
      dependencies: {
        openPathInConfiguredIde: vi.fn(async () => undefined),
        openPathInCodexApp,
        openCodexThreadInApp: vi.fn(async () => undefined),
        saveOpenAppMetaForWorktreePath,
      },
    });

    expect(openPathInCodexApp).toHaveBeenCalledWith("/worktrees/app-a");
    expect(saveOpenAppMetaForWorktreePath).toHaveBeenCalledWith("/worktrees/app-a", "codex-app", null);
    expect(result).toEqual({
      preferenceSaved: true,
      savedMeta: { openApp: "codex-app", threadId: null },
    });
  });
});
