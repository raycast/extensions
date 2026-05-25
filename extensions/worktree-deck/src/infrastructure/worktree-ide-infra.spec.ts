import { describe, expect, it, vi } from "vitest";
import {
  checkIdeAppInstalled,
  ensureIdeAppInstalled,
  openPathInIdeApp,
  resolveIdeAppMacOSName,
} from "./worktree-ide-infra";

describe("resolveIdeAppMacOSName", () => {
  it("対応 IDE の macOS アプリ名を返す", () => {
    expect(resolveIdeAppMacOSName("zed")).toBe("Zed");
    expect(resolveIdeAppMacOSName("vscode")).toBe("Visual Studio Code");
    expect(resolveIdeAppMacOSName("cursor")).toBe("Cursor");
  });
});

describe("openPathInIdeApp", () => {
  it("macOS の指定 IDE アプリで指定パスを開く", async () => {
    const execFileMock = vi.fn(async () => ({ stdout: "", stderr: "" }));

    await openPathInIdeApp("/repos/app-a", "vscode", execFileMock);

    expect(execFileMock).toHaveBeenNthCalledWith(1, "osascript", ["-e", 'id of app "Visual Studio Code"']);
    expect(execFileMock).toHaveBeenNthCalledWith(2, "open", ["-a", "Visual Studio Code", "/repos/app-a"]);
  });

  it("空のパスはエラーにする", async () => {
    const execFileMock = vi.fn(async () => ({ stdout: "", stderr: "" }));

    await expect(openPathInIdeApp("  ", "zed", execFileMock)).rejects.toThrow("Path is required.");
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("IDE アプリケーションが未インストールなら open を実行しない", async () => {
    const execFileMock = vi.fn(async () => {
      throw new Error("Application is not installed.");
    });

    await expect(openPathInIdeApp("/repos/app-a", "cursor", execFileMock)).rejects.toThrow(
      "Cursor is not installed. Install Cursor and try again.",
    );
    expect(execFileMock).toHaveBeenCalledOnce();
    expect(execFileMock).toHaveBeenCalledWith("osascript", ["-e", 'id of app "Cursor"']);
  });
});

describe("checkIdeAppInstalled", () => {
  it("osascript で IDE アプリケーションの登録有無を確認する", async () => {
    const execFileMock = vi.fn(async () => ({ stdout: "com.microsoft.VSCode", stderr: "" }));

    await expect(checkIdeAppInstalled("vscode", execFileMock)).resolves.toBe(true);

    expect(execFileMock).toHaveBeenCalledWith("osascript", ["-e", 'id of app "Visual Studio Code"']);
  });

  it("アプリケーションが未登録なら false を返す", async () => {
    const execFileMock = vi.fn(async () => {
      throw new Error("Application is not installed.");
    });

    await expect(checkIdeAppInstalled("cursor", execFileMock)).resolves.toBe(false);
  });
});

describe("ensureIdeAppInstalled", () => {
  it("IDE アプリケーションが未登録ならインストールを促すエラーを返す", async () => {
    const execFileMock = vi.fn(async () => {
      throw new Error("Application is not installed.");
    });

    await expect(ensureIdeAppInstalled("cursor", execFileMock)).rejects.toThrow(
      "Cursor is not installed. Install Cursor and try again.",
    );
  });
});
