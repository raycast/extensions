import { beforeEach, describe, expect, it, vi } from "vitest";

const readStorageMock = vi.hoisted(() => vi.fn());
const writeStorageMock = vi.hoisted(() => vi.fn());
const openPathInCodexAppMock = vi.hoisted(() => vi.fn());
const openCodexThreadInAppMock = vi.hoisted(() => vi.fn());
const openPathInConfiguredIdeMock = vi.hoisted(() => vi.fn());

vi.mock("./storage/json-file-storage", () => {
  return {
    readWorktreeDeckFileStorageJson: readStorageMock,
    writeWorktreeDeckFileStorageJson: writeStorageMock,
  };
});

vi.mock("./codex-app-infra", () => {
  return {
    openCodexThreadInApp: openCodexThreadInAppMock,
    openPathInCodexApp: openPathInCodexAppMock,
  };
});

vi.mock("./worktree-ide-app-store", () => {
  return {
    openPathInConfiguredIde: openPathInConfiguredIdeMock,
  };
});

import { openPathInPreferredApp } from "./worktree-open-app-store";

describe("worktree-open-app-store", () => {
  beforeEach(() => {
    readStorageMock.mockReset();
    writeStorageMock.mockReset();
    openPathInCodexAppMock.mockReset();
    openCodexThreadInAppMock.mockReset();
    openPathInConfiguredIdeMock.mockReset();

    readStorageMock.mockResolvedValue({});
    writeStorageMock.mockResolvedValue(undefined);
    openPathInCodexAppMock.mockResolvedValue(undefined);
    openCodexThreadInAppMock.mockResolvedValue(undefined);
    openPathInConfiguredIdeMock.mockResolvedValue(undefined);
  });

  it("IDE 起動前に次回 Enter の起動先を IDE に保存する", async () => {
    readStorageMock.mockResolvedValue({
      "/worktrees/app-a": {
        openApp: "codex-app",
        threadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b",
      },
    });

    const result = await openPathInPreferredApp("/worktrees/app-a", "zed", null);

    expect(openPathInConfiguredIdeMock).toHaveBeenCalledWith("/worktrees/app-a");
    expect(writeStorageMock.mock.invocationCallOrder[0]).toBeLessThan(
      openPathInConfiguredIdeMock.mock.invocationCallOrder[0],
    );
    expect(writeStorageMock).toHaveBeenCalledWith(expect.anything(), "worktree-open-app.json", {
      "/worktrees/app-a": {
        openApp: "zed",
        threadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b",
      },
    });
    expect(result).toEqual({
      preferenceSaved: true,
      savedMeta: {
        openApp: "zed",
        threadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b",
      },
    });
  });

  it("Codex App の thread 起動前に次回 Enter の起動先と thread id を保存する", async () => {
    readStorageMock.mockResolvedValue({
      "/worktrees/app-a": {
        openApp: "zed",
        threadId: null,
      },
    });

    const result = await openPathInPreferredApp(
      "/worktrees/app-a",
      "codex-app",
      "019DD94F-27E0-7AD1-8D17-3D628AC5D16B",
    );

    expect(openCodexThreadInAppMock).toHaveBeenCalledWith("019dd94f-27e0-7ad1-8d17-3d628ac5d16b");
    expect(writeStorageMock.mock.invocationCallOrder[0]).toBeLessThan(
      openCodexThreadInAppMock.mock.invocationCallOrder[0],
    );
    expect(writeStorageMock).toHaveBeenCalledWith(expect.anything(), "worktree-open-app.json", {
      "/worktrees/app-a": {
        openApp: "codex-app",
        threadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b",
      },
    });
    expect(result).toEqual({
      preferenceSaved: true,
      savedMeta: {
        openApp: "codex-app",
        threadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b",
      },
    });
  });

  it("Codex App を thread なしで開く前に次回 Enter の起動先を Codex App にして thread id を消す", async () => {
    readStorageMock.mockResolvedValue({
      "/worktrees/app-a": {
        openApp: "zed",
        threadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b",
      },
    });

    const result = await openPathInPreferredApp("/worktrees/app-a", "codex-app", null);

    expect(openPathInCodexAppMock).toHaveBeenCalledWith("/worktrees/app-a");
    expect(openCodexThreadInAppMock).not.toHaveBeenCalled();
    expect(writeStorageMock.mock.invocationCallOrder[0]).toBeLessThan(
      openPathInCodexAppMock.mock.invocationCallOrder[0],
    );
    expect(writeStorageMock).toHaveBeenCalledWith(expect.anything(), "worktree-open-app.json", {
      "/worktrees/app-a": {
        openApp: "codex-app",
        threadId: null,
      },
    });
    expect(result).toEqual({
      preferenceSaved: true,
      savedMeta: {
        openApp: "codex-app",
        threadId: null,
      },
    });
  });

  it("壊れた保存ファイルでも起動前に次回 Enter の起動先を保存し直す", async () => {
    readStorageMock.mockRejectedValue(new SyntaxError("Unexpected end of JSON input"));

    const result = await openPathInPreferredApp("/worktrees/app-a", "codex-app", null);

    expect(openPathInCodexAppMock).toHaveBeenCalledWith("/worktrees/app-a");
    expect(writeStorageMock).toHaveBeenCalledWith(expect.anything(), "worktree-open-app.json", {
      "/worktrees/app-a": {
        openApp: "codex-app",
        threadId: null,
      },
    });
    expect(result).toEqual({
      preferenceSaved: true,
      savedMeta: {
        openApp: "codex-app",
        threadId: null,
      },
    });
  });

  it("起動前の保存に失敗しても起動失敗として扱わない", async () => {
    writeStorageMock.mockRejectedValue(new Error("failed to save"));

    await expect(openPathInPreferredApp("/worktrees/app-a", "zed", null)).resolves.toEqual({
      preferenceSaved: false,
      savedMeta: null,
    });

    expect(openPathInConfiguredIdeMock).toHaveBeenCalledWith("/worktrees/app-a");
    expect(writeStorageMock).toHaveBeenCalled();
  });

  it("起動に失敗しても次回 Enter の起動先は保存済みにする", async () => {
    openPathInConfiguredIdeMock.mockRejectedValue(new Error("failed to open"));

    await expect(openPathInPreferredApp("/worktrees/app-a", "zed", null)).rejects.toThrow("failed to open");

    expect(writeStorageMock).toHaveBeenCalledWith(expect.anything(), "worktree-open-app.json", {
      "/worktrees/app-a": {
        openApp: "zed",
        threadId: null,
      },
    });
  });
});
