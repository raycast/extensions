import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the @raycast/api module
vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({})),
}));

// Mock child_process
vi.mock("child_process", () => ({
  execFileSync: vi.fn(() => Buffer.from("mock output")),
  execFile: vi.fn(),
}));

// Mock fs
vi.mock("fs", () => ({
  accessSync: vi.fn(),
  constants: { X_OK: 1 },
}));

import { getPreferenceValues } from "@raycast/api";
import { execFile, execFileSync } from "child_process";
import { accessSync } from "fs";
import { FlashspaceError, getErrorMessage, getFlashspacePath, runFlashspace, runFlashspaceAsync } from "../cli";

describe("getFlashspacePath", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return user-configured path when set and accessible", () => {
    vi.mocked(getPreferenceValues).mockReturnValue({ flashspacePath: "/custom/path/flashspace" });
    vi.mocked(accessSync).mockImplementation(() => undefined);

    expect(getFlashspacePath()).toBe("/custom/path/flashspace");
  });

  it("should fall through when user-configured path is not accessible", () => {
    vi.mocked(getPreferenceValues).mockReturnValue({ flashspacePath: "/bad/path/flashspace" });
    let callCount = 0;
    vi.mocked(accessSync).mockImplementation(() => {
      callCount++;
      if (callCount <= 1) throw new Error("ENOENT");
      // second call is the first Homebrew path
    });

    expect(getFlashspacePath()).toBe("/opt/homebrew/bin/flashspace");
  });

  it("should try /opt/homebrew/bin/flashspace first", () => {
    vi.mocked(getPreferenceValues).mockReturnValue({});
    vi.mocked(accessSync).mockImplementation(() => undefined);

    expect(getFlashspacePath()).toBe("/opt/homebrew/bin/flashspace");
  });

  it("should try /usr/local/bin/flashspace second", () => {
    vi.mocked(getPreferenceValues).mockReturnValue({});
    let callCount = 0;
    vi.mocked(accessSync).mockImplementation(() => {
      callCount++;
      if (callCount <= 1) throw new Error("ENOENT");
    });

    expect(getFlashspacePath()).toBe("/usr/local/bin/flashspace");
  });

  it("should fall back to 'flashspace' when no paths are accessible", () => {
    vi.mocked(getPreferenceValues).mockReturnValue({});
    vi.mocked(accessSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    expect(getFlashspacePath()).toBe("flashspace");
  });
});

describe("runFlashspace", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPreferenceValues).mockReturnValue({});
    vi.mocked(accessSync).mockImplementation(() => undefined);
  });

  it("should call execFileSync with the resolved path and args", () => {
    vi.mocked(execFileSync).mockReturnValue(Buffer.from("output"));

    const result = runFlashspace(["list-workspaces"]);

    expect(execFileSync).toHaveBeenCalledWith("/opt/homebrew/bin/flashspace", ["list-workspaces"], { timeout: 10000 });
    expect(result).toBe("output");
  });

  it("should pass multiple args as an array (not shell-concatenated)", () => {
    vi.mocked(execFileSync).mockReturnValue(Buffer.from("ok"));

    runFlashspace(["workspace", "--name", "My Workspace"]);

    expect(execFileSync).toHaveBeenCalledWith("/opt/homebrew/bin/flashspace", ["workspace", "--name", "My Workspace"], {
      timeout: 10000,
    });
  });

  it("should propagate errors from execFileSync", () => {
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("Command failed");
    });

    expect(() => runFlashspace(["bad-command"])).toThrow("Command failed");
  });
});

describe("runFlashspaceAsync", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPreferenceValues).mockReturnValue({});
    vi.mocked(accessSync).mockImplementation(() => undefined);
  });

  function mockExecFileSuccess(stdout: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(execFile).mockImplementation((_file: any, _args: any, _opts: any, callback: any) => {
      callback(null, stdout, "");
      return {} as ReturnType<typeof execFile>;
    });
  }

  function mockExecFileFailure(errorMessage: string, stderr = "") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(execFile).mockImplementation((_file: any, _args: any, _opts: any, callback: any) => {
      callback(new Error(errorMessage), "", stderr);
      return {} as ReturnType<typeof execFile>;
    });
  }

  it("should resolve with stdout on success", async () => {
    mockExecFileSuccess("workspace1\nworkspace2\n");

    const result = await runFlashspaceAsync(["list-workspaces"]);

    expect(result).toBe("workspace1\nworkspace2\n");
    expect(execFile).toHaveBeenCalledWith(
      "/opt/homebrew/bin/flashspace",
      ["list-workspaces"],
      { timeout: 10000 },
      expect.any(Function),
    );
  });

  it("should pass multiple args as an array to prevent shell injection", async () => {
    mockExecFileSuccess("ok");

    await runFlashspaceAsync(["workspace", "--name", "My Workspace"]);

    expect(execFile).toHaveBeenCalledWith(
      "/opt/homebrew/bin/flashspace",
      ["workspace", "--name", "My Workspace"],
      { timeout: 10000 },
      expect.any(Function),
    );
  });

  it("should reject with FlashspaceError on failure", async () => {
    mockExecFileFailure("Command failed", "error: unknown command");

    await expect(runFlashspaceAsync(["bad-command"])).rejects.toThrow(FlashspaceError);
  });

  it("should include stderr in the thrown FlashspaceError", async () => {
    mockExecFileFailure("Command failed", "error: workspace not found");

    const error = await runFlashspaceAsync(["bad-command"]).catch((e) => e);

    expect(error).toBeInstanceOf(FlashspaceError);
    expect(error.stderr).toBe("error: workspace not found");
  });

  it("should set userMessage to first line of stderr when available", async () => {
    mockExecFileFailure("Command failed", "error: workspace not found\nmore detail");

    const error = await runFlashspaceAsync(["bad-command"]).catch((e) => e);

    expect(error.userMessage).toBe("error: workspace not found");
  });

  it("should set an actionable userMessage when the binary is not found (ENOENT)", async () => {
    mockExecFileFailure("ENOENT: no such file or directory", "");

    const error = await runFlashspaceAsync(["list-workspaces"]).catch((e) => e);

    expect(error.userMessage).toContain("flashspace binary not found");
    expect(error.userMessage).toContain("brew install flashspace");
  });

  it("should set an actionable userMessage for permission denied errors", async () => {
    mockExecFileFailure("EACCES: permission denied", "");

    const error = await runFlashspaceAsync(["list-workspaces"]).catch((e) => e);

    expect(error.userMessage).toContain("Permission denied");
  });

  it("should respect a custom timeout", async () => {
    mockExecFileSuccess("ok");

    await runFlashspaceAsync(["list-workspaces"], { timeoutMs: 5000 });

    expect(execFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      { timeout: 5000 },
      expect.any(Function),
    );
  });
});

describe("FlashspaceError", () => {
  it("should store stderr and userMessage", () => {
    const err = new FlashspaceError("Command failed", "stderr text", "user-facing message");

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(FlashspaceError);
    expect(err.message).toBe("Command failed");
    expect(err.stderr).toBe("stderr text");
    expect(err.userMessage).toBe("user-facing message");
    expect(err.name).toBe("FlashspaceError");
  });
});

describe("getErrorMessage", () => {
  it("should return userMessage for FlashspaceError", () => {
    const err = new FlashspaceError("raw message", "stderr", "actionable user message");
    expect(getErrorMessage(err)).toBe("actionable user message");
  });

  it("should return message for plain Error", () => {
    expect(getErrorMessage(new Error("plain error"))).toBe("plain error");
  });

  it("should stringify non-Error values", () => {
    expect(getErrorMessage("string error")).toBe("string error");
    expect(getErrorMessage(42)).toBe("42");
  });
});
