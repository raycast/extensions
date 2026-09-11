import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveHerdrBinary, runHerdr } from "../src/lib/herdr";

vi.mock("node:fs/promises", () => ({ access: vi.fn() }));
vi.mock("node:child_process", () => ({ execFile: vi.fn() }));

const preferences: { herdrPath?: string; sessionName?: string } = {};
vi.mock("../src/lib/preferences", () => ({
  getHerdrPreferences: () => preferences,
}));

beforeEach(() => {
  preferences.herdrPath = "~/.local/bin/herdr";
  preferences.sessionName = undefined;
  vi.mocked(access).mockReset().mockResolvedValue();
  vi.mocked(execFile).mockReset();
});

describe("resolveHerdrBinary", () => {
  it("expands a leading tilde in the configured binary path", async () => {
    const expected = join(homedir(), ".local", "bin", "herdr");

    await expect(resolveHerdrBinary()).resolves.toBe(expected);
    expect(access).toHaveBeenCalledWith(expected, constants.X_OK);
  });

  it("expands a $HOME prefix in the configured binary path", async () => {
    preferences.herdrPath = "$HOME/.local/bin/herdr";
    const expected = join(homedir(), ".local", "bin", "herdr");

    await expect(resolveHerdrBinary()).resolves.toBe(expected);
    expect(access).toHaveBeenCalledWith(expected, constants.X_OK);
  });
});

describe("runHerdr", () => {
  function mockExecFileSuccess() {
    // execFile's promisify-compatible callback signature: the callback is the
    // last argument after (file, args, options).
    vi.mocked(execFile).mockImplementation(((...callArgs: unknown[]) => {
      const callback = callArgs.at(-1) as (error: Error | null, stdout: string, stderr: string) => void;
      callback(null, "{}", "");
      return {};
    }) as never);
  }

  function executedArgs(): unknown {
    return vi.mocked(execFile).mock.calls[0][1];
  }

  // Regression: without a --session flag the CLI falls back to an inherited
  // HERDR_SESSION, so a value leaking into the Raycast process environment
  // could silently retarget every command.
  it("selects the configured session with the --session flag", async () => {
    preferences.sessionName = "work";
    mockExecFileSuccess();

    await runHerdr(["pane", "list"]);
    expect(executedArgs()).toEqual(["--session", "work", "pane", "list"]);
  });

  it("names the default session explicitly when no session is configured", async () => {
    preferences.sessionName = undefined;
    mockExecFileSuccess();

    await runHerdr(["pane", "list"]);
    expect(executedArgs()).toEqual(["--session", "default", "pane", "list"]);
  });

  it("omits the session flag when a command opts out with an empty session", async () => {
    preferences.sessionName = "work";
    mockExecFileSuccess();

    await runHerdr(["session", "list", "--json"], { session: "" });
    expect(executedArgs()).toEqual(["session", "list", "--json"]);
  });
});
