import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { execaMock } = vi.hoisted(() => ({
  execaMock: vi.fn(),
}));

vi.mock("execa", () => ({
  execa: execaMock,
}));

import { applySettingsAndReload } from "../../src/lib/handy";

const CUSTOM_APP_PATH = "/Users/me/Apps/Handy Beta+.app";
const CUSTOM_BINARY_PATH = `${CUSTOM_APP_PATH}/Contents/MacOS/Handy`;
const CUSTOM_PROCESS_PATTERN =
  "/Users/me/Apps/Handy Beta\\+\\.app/Contents/MacOS/Handy";
const DEFAULT_PROCESS_PATTERN =
  "/Applications/Handy\\.app/Contents/MacOS/Handy";

function isPgrepForCustomPath(command: string, args: string[]): boolean {
  return (
    command === "pgrep" &&
    args[0] === "-f" &&
    args[1] === CUSTOM_PROCESS_PATTERN
  );
}

function expectOnlyConfiguredInstallTargeted() {
  expect(execaMock).not.toHaveBeenCalledWith("pgrep", [
    "-f",
    DEFAULT_PROCESS_PATTERN,
  ]);
  expect(execaMock).not.toHaveBeenCalledWith("pgrep", ["-x", "Handy"]);
  expect(execaMock).not.toHaveBeenCalledWith("pkill", [
    "-f",
    DEFAULT_PROCESS_PATTERN,
  ]);
  expect(execaMock).not.toHaveBeenCalledWith("pkill", [
    "-9",
    "-f",
    DEFAULT_PROCESS_PATTERN,
  ]);
  expect(execaMock).not.toHaveBeenCalledWith("pkill", ["-x", "Handy"]);
  expect(execaMock).not.toHaveBeenCalledWith("pkill", ["-9", "-x", "Handy"]);
  expect(execaMock).not.toHaveBeenCalledWith("open", [
    "/Applications/Handy.app",
  ]);
  expect(execaMock).not.toHaveBeenCalledWith("open", ["-a", "Handy"]);
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
      `tell application "${CUSTOM_APP_PATH}" to quit`,
    ]);
    expect(execaMock).toHaveBeenCalledWith("open", [CUSTOM_APP_PATH]);
    expectOnlyConfiguredInstallTargeted();
  });

  it("does not terminate the default install when restarting a custom binary", async () => {
    const customPathRunning = [true, true, false];
    const apply = vi.fn();
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(6001);

    execaMock.mockImplementation(
      async (command: string, args: string[] = []) => {
        if (isPgrepForCustomPath(command, args)) {
          if (customPathRunning.shift()) return { stdout: "123" };
          throw new Error("not running");
        }
        if (command === "pgrep" && args[1] === DEFAULT_PROCESS_PATTERN) {
          return { stdout: "456" };
        }
        if (command === "pgrep") {
          throw new Error("not running");
        }
        if (command === "osascript" || command === "pkill") {
          return { stdout: "" };
        }
        if (command === "open") {
          return { stdout: "" };
        }
        throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
      },
    );

    await applySettingsAndReload(apply, CUSTOM_BINARY_PATH);

    expect(execaMock).toHaveBeenCalledWith("pkill", [
      "-f",
      CUSTOM_PROCESS_PATTERN,
    ]);
    expect(execaMock).toHaveBeenCalledWith("open", [CUSTOM_APP_PATH]);
    expectOnlyConfiguredInstallTargeted();
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
        if (isPgrepForCustomPath(command, args)) {
          return { stdout: "123" };
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
    expectOnlyConfiguredInstallTargeted();
  });
});
