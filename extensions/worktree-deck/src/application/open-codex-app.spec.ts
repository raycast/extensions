import { describe, expect, it, vi } from "vitest";

import { openCodexAppUsecase } from "./open-codex-app.usecase";

describe("openCodexAppUsecase", () => {
  it("指定された worktree パスを Codex App 起動依存へ渡す", async () => {
    const openPathInCodexApp = vi.fn<[(path: string) => Promise<void>]>().mockResolvedValue(undefined);

    await openCodexAppUsecase.open({
      path: "  /tmp/repo-a  ",
      dependencies: { openPathInCodexApp },
    });

    expect(openPathInCodexApp).toHaveBeenCalledWith("/tmp/repo-a");
  });

  it("空のパスなら起動せず英語エラーにする", async () => {
    const openPathInCodexApp = vi.fn<[(path: string) => Promise<void>]>().mockResolvedValue(undefined);

    await expect(
      openCodexAppUsecase.open({
        path: "  ",
        dependencies: { openPathInCodexApp },
      }),
    ).rejects.toThrow("Worktree path is required.");
    expect(openPathInCodexApp).not.toHaveBeenCalled();
  });
});
