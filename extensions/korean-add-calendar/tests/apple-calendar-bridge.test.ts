import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.fn();
const accessMock = vi.fn();
const chmodMock = vi.fn();
const lstatMock = vi.fn();
const mkdirMock = vi.fn();
const readFileMock = vi.fn();
const renameMock = vi.fn();
const unlinkMock = vi.fn();

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

vi.mock("node:fs/promises", () => ({
  access: accessMock,
  chmod: chmodMock,
  lstat: lstatMock,
  mkdir: mkdirMock,
  readFile: readFileMock,
  rename: renameMock,
  unlink: unlinkMock,
}));

type ExecResult = { stdout: string; stderr: string };
type ExecCallback = (error: Error | null, result?: ExecResult) => void;

function getExecCallback(args: unknown[]): ExecCallback {
  const callback = args[args.length - 1];
  if (typeof callback !== "function") {
    throw new Error("execFile callback is missing");
  }
  return callback as ExecCallback;
}

describe("apple-calendar bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.PATH = "/usr/bin:/bin";
    process.env.HOME = "/Users/mock";
    process.env.TMPDIR = "/tmp";
    process.env.SECRET_TOKEN = "should-not-leak";

    accessMock.mockResolvedValue(undefined);
    chmodMock.mockResolvedValue(undefined);
    lstatMock.mockResolvedValue({
      isDirectory: () => true,
      isSymbolicLink: () => false,
    });
    mkdirMock.mockResolvedValue(undefined);
    readFileMock.mockResolvedValue(Buffer.from("swift-script-content", "utf8"));
    renameMock.mockResolvedValue(undefined);
    unlinkMock.mockResolvedValue(undefined);
  });

  it("passes only allowlisted env and payload to osascript", async () => {
    execFileMock.mockImplementation((...args: unknown[]) => {
      const callback = getExecCallback(args);
      callback(null, { stdout: "", stderr: "" });
    });

    const module = await import("../src/lib/apple-calendar");
    await module.openCalendarAtDate(new Date(2026, 2, 21, 10, 30, 0, 0));

    expect(execFileMock).toHaveBeenCalledTimes(1);
    const [executable, commandArgs, options] = execFileMock.mock.calls[0] as [
      string,
      string[],
      { env: NodeJS.ProcessEnv },
    ];

    expect(executable).toBe("osascript");
    expect(commandArgs.slice(0, 3)).toEqual(["-l", "JavaScript", "-e"]);
    expect(options.env.SECRET_TOKEN).toBeUndefined();
    expect(options.env.PATH).toBe("/usr/bin:/bin");
    expect(options.env.RAYCAST_KOREAN_CALENDAR_OPEN_PAYLOAD).toBeDefined();
  });

  it("falls back to interpreted swift when cache root validation fails", async () => {
    lstatMock.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    });

    execFileMock.mockImplementation((...args: unknown[]) => {
      const callback = getExecCallback(args);
      const executable = String(args[0]);
      if (executable !== "swift") {
        callback(new Error(`unexpected executable: ${executable}`));
        return;
      }
      callback(
        null,
        {
          stdout: JSON.stringify({ calendars: [] }),
          stderr: "",
        },
      );
    });

    const module = await import("../src/lib/apple-calendar");
    const result = await module.listWritableCalendars();

    expect(result.calendars).toEqual([]);
    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(execFileMock.mock.calls[0]?.[0]).toBe("swift");
  });

  it("compiles script into uid-scoped cache and executes compiled binary", async () => {
    const scriptBytes = Buffer.from("swift-script-content", "utf8");
    readFileMock.mockResolvedValue(scriptBytes);

    const scriptHash = createHash("sha256").update(scriptBytes).digest("hex").slice(0, 16);
    const cacheRoot = path.join(
      os.tmpdir(),
      `raycast-korean-calendar-swift-${typeof process.getuid === "function" ? process.getuid() : "unknown"}`,
    );
    const binaryPath = path.join(cacheRoot, `list_calendars-${scriptHash}`);

    accessMock.mockImplementation(async (...args: unknown[]) => {
      const filePath = String(args[0]);
      if (filePath === "/mock/assets/list_calendars.swift") {
        return;
      }
      if (filePath === binaryPath) {
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      }
    });

    execFileMock.mockImplementation((...args: unknown[]) => {
      const callback = getExecCallback(args);
      const executable = String(args[0]);

      if (executable === "swiftc") {
        callback(null, { stdout: "", stderr: "" });
        return;
      }

      if (executable === binaryPath) {
        callback(
          null,
          {
            stdout: JSON.stringify({
              defaultCalendarIdentifier: "calendar-1",
              calendars: [{ id: "calendar-1", title: "Work", sourceTitle: "iCloud" }],
            }),
            stderr: "",
          },
        );
        return;
      }

      callback(new Error(`unexpected executable: ${executable}`));
    });

    const module = await import("../src/lib/apple-calendar");
    const result = await module.listWritableCalendars();

    expect(result.defaultCalendarIdentifier).toBe("calendar-1");
    expect(result.calendars[0]?.isDefault).toBe(true);
    expect(mkdirMock).toHaveBeenCalledWith(cacheRoot, { recursive: true, mode: 0o700 });
    expect(execFileMock.mock.calls[0]?.[0]).toBe("swiftc");
    expect(execFileMock.mock.calls[1]?.[0]).toBe(binaryPath);
    const swiftcOptions = execFileMock.mock.calls[0]?.[2] as { env: NodeJS.ProcessEnv };
    expect(swiftcOptions.env.SECRET_TOKEN).toBeUndefined();
  });

  it("adds System Settings guidance when calendar permission is denied", async () => {
    lstatMock.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    });

    execFileMock.mockImplementation((...args: unknown[]) => {
      const callback = getExecCallback(args);
      callback(Object.assign(new Error("Command failed"), { stderr: "ERROR: Calendar permission denied" }));
    });

    const module = await import("../src/lib/apple-calendar");
    await expect(module.listWritableCalendars()).rejects.toThrow(
      "시스템 설정 > 개인정보 보호 및 보안 > 캘린더에서 Raycast 권한을 허용한 뒤 다시 시도해 주세요.",
    );
  });
});
