import { beforeEach, describe, expect, it, vi } from "vitest";

const readStorageMock = vi.hoisted(() => vi.fn());
const writeStorageMock = vi.hoisted(() => vi.fn());
const openPathInIdeAppMock = vi.hoisted(() => vi.fn());
const ensureIdeAppInstalledMock = vi.hoisted(() => vi.fn());

vi.mock("./storage/json-file-storage", () => {
  return {
    readWorktreeDeckFileStorageJson: readStorageMock,
    writeWorktreeDeckFileStorageJson: writeStorageMock,
  };
});

vi.mock("./worktree-ide-infra", () => {
  return {
    ensureIdeAppInstalled: ensureIdeAppInstalledMock,
    openPathInIdeApp: openPathInIdeAppMock,
  };
});

import { loadPreferredIdeApp, openPathInConfiguredIde, savePreferredIdeApp } from "./worktree-ide-app-store";

describe("worktree-ide-app-store", () => {
  beforeEach(() => {
    readStorageMock.mockReset();
    writeStorageMock.mockReset();
    openPathInIdeAppMock.mockReset();
    ensureIdeAppInstalledMock.mockReset();

    readStorageMock.mockResolvedValue({});
    writeStorageMock.mockResolvedValue(undefined);
    openPathInIdeAppMock.mockResolvedValue(undefined);
    ensureIdeAppInstalledMock.mockResolvedValue(undefined);
  });

  it("未保存の場合は Zed を返す", async () => {
    await expect(loadPreferredIdeApp()).resolves.toBe("zed");
  });

  it("保存済み IDE アプリケーションを読み込む", async () => {
    readStorageMock.mockResolvedValue({ ideApp: "cursor" });

    await expect(loadPreferredIdeApp()).resolves.toBe("cursor");
  });

  it("IDE アプリケーション設定を保存する", async () => {
    await expect(savePreferredIdeApp("vscode")).resolves.toBe("vscode");

    expect(ensureIdeAppInstalledMock).toHaveBeenCalledWith("vscode");
    expect(writeStorageMock).toHaveBeenCalledWith(expect.anything(), "general-settings.json", { ideApp: "vscode" });
  });

  it("IDE アプリケーションが未インストールなら設定を保存しない", async () => {
    ensureIdeAppInstalledMock.mockRejectedValue(new Error("Cursor is not installed. Install Cursor and try again."));

    await expect(savePreferredIdeApp("cursor")).rejects.toThrow(
      "Cursor is not installed. Install Cursor and try again.",
    );

    expect(writeStorageMock).not.toHaveBeenCalled();
  });

  it("保存済み IDE アプリケーションでパスを開く", async () => {
    readStorageMock.mockResolvedValue({ ideApp: "cursor" });

    await openPathInConfiguredIde("/worktrees/app-a");

    expect(openPathInIdeAppMock).toHaveBeenCalledWith("/worktrees/app-a", "cursor");
  });
});
