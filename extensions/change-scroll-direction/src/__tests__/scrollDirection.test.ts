import { promisify } from "node:util";

jest.mock("node:child_process", () => {
  const execFile = jest.fn();
  // Node marks its own execFile so that promisify resolves to { stdout, stderr };
  // the mock has to do the same for the module under test to see that shape.
  Object.defineProperty(execFile, promisify.custom, {
    value: (...args: unknown[]) => execFile(...args),
  });
  return { execFile };
});

import { execFile } from "node:child_process";
import { isNaturalScrollingOn, setNaturalScrolling } from "../scrollDirection";

const execFileMock = execFile as unknown as jest.Mock;

beforeEach(() => {
  execFileMock.mockReset();
});

function osascriptSource(): string {
  const [, args] = execFileMock.mock.calls[0];
  return args[3];
}

describe("isNaturalScrollingOn", () => {
  it("reports natural scrolling as on when swipeScrollDirection is true", async () => {
    execFileMock.mockResolvedValue({ stdout: "true\n", stderr: "" });

    await expect(isNaturalScrollingOn()).resolves.toBe(true);

    const [bin, args] = execFileMock.mock.calls[0];
    expect(bin).toBe("/usr/bin/osascript");
    expect(args.slice(0, 3)).toEqual(["-l", "JavaScript", "-e"]);
    expect(osascriptSource()).toContain("PreferencePanesSupport.framework");
    expect(osascriptSource()).toContain('ObjC.bindFunction("swipeScrollDirection", ["bool", []])');
    expect(osascriptSource()).toContain("$.swipeScrollDirection()");
  });

  it("reports natural scrolling as off when swipeScrollDirection is false", async () => {
    execFileMock.mockResolvedValue({ stdout: "false\n", stderr: "" });

    await expect(isNaturalScrollingOn()).resolves.toBe(false);
  });

  it("propagates a failing script so the command can report it", async () => {
    execFileMock.mockRejectedValue(new Error("osascript failed"));

    await expect(isNaturalScrollingOn()).rejects.toThrow("osascript failed");
  });

  it("rejects an unexpected value instead of guessing the current state", async () => {
    execFileMock.mockResolvedValue({ stdout: "\n", stderr: "" });

    await expect(isNaturalScrollingOn()).rejects.toThrow("Unexpected scroll direction value:");
  });
});

describe("setNaturalScrolling", () => {
  it("applies the preference through setSwipeScrollDirection", async () => {
    execFileMock.mockResolvedValue({ stdout: "", stderr: "" });

    await setNaturalScrolling(true);

    const [bin, args] = execFileMock.mock.calls[0];
    expect(bin).toBe("/usr/bin/osascript");
    expect(args.slice(0, 3)).toEqual(["-l", "JavaScript", "-e"]);
    expect(args[3]).toContain("PreferencePanesSupport.framework");
    expect(args[3]).toContain("$.setSwipeScrollDirection(true)");
  });

  it("passes the disabled state through to the same call", async () => {
    execFileMock.mockResolvedValue({ stdout: "", stderr: "" });

    await setNaturalScrolling(false);

    expect(execFileMock.mock.calls[0][1][3]).toContain("$.setSwipeScrollDirection(false)");
  });

  it("propagates a failing script so the command can report it", async () => {
    execFileMock.mockRejectedValue(new Error("osascript failed"));

    await expect(setNaturalScrolling(true)).rejects.toThrow("osascript failed");
  });
});
