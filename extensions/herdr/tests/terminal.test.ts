import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { launchHerdrInTerminal } from "../src/lib/terminal";

vi.mock("node:child_process", () => ({ execFile: vi.fn(), spawn: vi.fn() }));
vi.mock("node:fs/promises", () => ({
  access: vi.fn().mockResolvedValue(undefined),
  chmod: vi.fn(),
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  writeFile: vi.fn(),
}));

const preferences: { herdrPath?: string; sessionName?: string; customTerminalLauncher?: string } = {};
vi.mock("../src/lib/preferences", () => ({
  getHerdrPreferences: () => preferences,
}));

const binary = join(homedir(), ".local", "bin", "herdr");

beforeEach(() => {
  preferences.herdrPath = "~/.local/bin/herdr";
  preferences.sessionName = undefined;
  preferences.customTerminalLauncher = "term -e {herdr} {args}";
  vi.mocked(spawn).mockReset();
  const child = {
    once(event: string, callback: () => void) {
      if (event === "spawn") callback();
      return child;
    },
    unref() {},
  };
  vi.mocked(spawn).mockReturnValue(child as never);
});

function spawnedArgs(): unknown {
  return vi.mocked(spawn).mock.calls[0][1];
}

describe("launchHerdrInTerminal", () => {
  // Regression: the launched client inherits the Raycast process environment,
  // and without a --session flag the CLI falls back to an inherited
  // HERDR_SESSION, so an unset preference must still name the default session.
  it("names the default session explicitly when no session is configured", async () => {
    await launchHerdrInTerminal();
    expect(spawnedArgs()).toEqual(["-e", binary, "--session", "default"]);
  });

  it("names the configured session explicitly", async () => {
    preferences.sessionName = "work";

    await launchHerdrInTerminal();
    expect(spawnedArgs()).toEqual(["-e", binary, "--session", "work"]);
  });

  it("omits the session flag when the caller opts out with its own argv", async () => {
    await launchHerdrInTerminal(["session", "attach", "review"], { includePreferredSession: false });
    expect(spawnedArgs()).toEqual(["-e", binary, "session", "attach", "review"]);
  });
});
