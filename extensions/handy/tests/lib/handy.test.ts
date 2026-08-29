import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { execaMock } = vi.hoisted(() => ({
  execaMock: vi.fn(),
}));

vi.mock("execa", () => ({
  execa: execaMock,
}));

import { applySettingsAndReload } from "../../src/lib/handy";

const CUSTOM_BINARY_PATH =
  "/Users/me/Apps/Handy Beta+.app/Contents/MacOS/Handy";
const CUSTOM_PROCESS_PATTERN =
  "/Users/me/Apps/Handy Beta\\+\\.app/Contents/MacOS/Handy";

function isSystemEventsProcessCheck(command: string, args: string[]): boolean {
  return (
    command === "osascript" &&
    args[1]?.includes('exists application process "Handy"')
  );
}

function isPgrepForCustomPath(command: string, args: string[]): boolean {
  return (
    command === "pgrep" &&
    args[0] === "-f" &&
    args[1] === CUSTOM_PROCESS_PATTERN
  );
}

describe("applySettingsAndReload", () => {
  beforeEach(() => {
    execaMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects and quits Handy from a custom configured app path", async () => {
    const customPathRunning = [true, false];
    const apply = vi.fn();

    execaMock.mockImplementation(
      async (command: string, args: string[] = []) => {
        if (isSystemEventsProcessCheck(command, args)) {
          return { stdout: "false" };
        }
        if (isPgrepForCustomPath(command, args)) {
          if (customPathRunning.shift()) return { stdout: "123" };
          throw new Error("not running");
        }
        if (command === "pgrep") {
          throw new Error("not running");
        }
        if (command === "osascript") {
          return { stdout: "" };
        }
        if (command === "open") {
          return { stdout: "" };
        }
        throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
      },
    );

    await applySettingsAndReload(apply, CUSTOM_BINARY_PATH);

    expect(apply).toHaveBeenCalledTimes(2);
    expect(execaMock).toHaveBeenCalledWith("pgrep", [
      "-f",
      CUSTOM_PROCESS_PATTERN,
    ]);
    expect(execaMock).toHaveBeenCalledWith("osascript", [
      "-e",
      'tell application "Handy" to quit',
    ]);
    expect(execaMock).toHaveBeenCalledWith("open", [
      "/Users/me/Apps/Handy Beta+.app",
    ]);
  });

  it("cancels restart instead of relaunching when Handy never exits", async () => {
    const apply = vi.fn();
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(6001)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(6001)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(6001);

    execaMock.mockImplementation(
      async (command: string, args: string[] = []) => {
        if (isSystemEventsProcessCheck(command, args)) {
          return { stdout: "true" };
        }
        if (command === "osascript" || command === "pkill") {
          return { stdout: "" };
        }
        throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
      },
    );

    await expect(
      applySettingsAndReload(apply, CUSTOM_BINARY_PATH),
    ).rejects.toThrow("Handy did not quit; restart canceled");

    expect(apply).toHaveBeenCalledTimes(1);
    expect(execaMock).toHaveBeenCalledWith("pkill", [
      "-f",
      CUSTOM_PROCESS_PATTERN,
    ]);
    expect(execaMock).toHaveBeenCalledWith("pkill", [
      "-9",
      "-f",
      CUSTOM_PROCESS_PATTERN,
    ]);
    expect(execaMock).not.toHaveBeenCalledWith("open", expect.anything());
  });
});
