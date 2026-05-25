import { describe, expect, it, vi } from "vitest";

import { openCodexThreadInApp, openPathInCodexApp } from "./codex-app-infra";

describe("openCodexThreadInApp", () => {
  it("Codex App の thread deeplink を macOS で開く", async () => {
    const execFileMock = vi.fn(async () => ({ stdout: "", stderr: "" }));

    await openCodexThreadInApp("019dd94f-27e0-7ad1-8d17-3d628ac5d16b", execFileMock);

    expect(execFileMock).toHaveBeenCalledWith("open", ["codex://threads/019dd94f-27e0-7ad1-8d17-3d628ac5d16b"]);
  });
});

describe("openPathInCodexApp", () => {
  it("Codex CLI が見つからない場合は Codex 操作用の案内エラーで失敗する", async () => {
    const execFileMock = vi.fn(async () => {
      const error = Object.assign(new Error("spawn codex ENOENT"), {
        code: "ENOENT",
        syscall: "spawn codex",
        path: "codex",
      });
      throw error;
    });

    await expect(openPathInCodexApp("/worktrees/app", execFileMock)).rejects.toThrow(
      "Codex CLI is required for Codex actions. Install Codex and ensure it is available in PATH.",
    );
  });
});
