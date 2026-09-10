import { execFile, spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { launchHerdrInTerminal } from "../src/lib/terminal";
import { storage } from "./helpers/raycast-api";

vi.mock("node:child_process", () => ({ execFile: vi.fn(), spawn: vi.fn() }));
vi.mock("@raycast/api", () => import("./helpers/raycast-api"));
vi.mock("node:fs/promises", () => ({
  access: vi.fn().mockResolvedValue(undefined),
  chmod: vi.fn(),
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  writeFile: vi.fn(),
}));

const preferences: {
  herdrPath?: string;
  sessionName?: string;
  customTerminalLauncher?: string;
  terminalApplication?: { bundleId: string; name: string; path: string };
} = {};
vi.mock("../src/lib/preferences", () => ({
  getHerdrPreferences: () => preferences,
}));

const binary = join(homedir(), ".local", "bin", "herdr");

beforeEach(() => {
  preferences.herdrPath = "~/.local/bin/herdr";
  preferences.sessionName = undefined;
  preferences.customTerminalLauncher = "term -e {herdr} {args}";
  preferences.terminalApplication = undefined;
  storage.clear();
  execCalls.length = 0;
  vi.mocked(execFile).mockReset();
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

const execCalls: Array<{ path: string; args: string[] }> = [];

// execFile is called as (path, args, options, callback) throughout terminal.ts.
function mockExecFile(respond: (path: string, args: string[]) => string) {
  vi.mocked(execFile).mockImplementation(((
    path: string,
    args: string[],
    _options: unknown,
    callback: (error: Error | null, stdout: string, stderr: string) => void,
  ) => {
    execCalls.push({ path, args });
    callback(null, respond(path, args), "");
    return {};
  }) as never);
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
    await launchHerdrInTerminal(["session", "attach", "review"], { includeSession: false });
    expect(spawnedArgs()).toEqual(["-e", binary, "session", "attach", "review"]);
  });

  it("launches the Selected Session ahead of the configured session", async () => {
    storage.set("selectedSession", "tmp-b");
    preferences.sessionName = "work";

    await launchHerdrInTerminal();
    expect(spawnedArgs()).toEqual(["-e", binary, "--session", "tmp-b"]);
  });
});

describe("launchHerdrInTerminal in WezTerm", () => {
  const wezterm = "/Applications/WezTerm.app/Contents/MacOS/wezterm";

  beforeEach(() => {
    preferences.customTerminalLauncher = undefined;
    preferences.terminalApplication = {
      bundleId: "com.github.wez.wezterm",
      name: "WezTerm",
      path: "/Applications/WezTerm.app",
    };
  });

  function spawnArgs(): string[] | undefined {
    return execCalls.find((call) => call.path === wezterm && call.args[1] === "spawn")?.args;
  }

  it("spawns a tab into the first listed window by default", async () => {
    mockExecFile((_path, args) =>
      args[1] === "list" ? JSON.stringify([{ window_id: 4, pane_id: 1, tty_name: "/dev/ttys001" }]) : "9",
    );

    await launchHerdrInTerminal(["session", "attach", "tmp-b"], { includeSession: false });
    expect(spawnArgs()).toEqual(["cli", "spawn", "--window-id", "4", "--", binary, "session", "attach", "tmp-b"]);
  });

  it("spawns a new window without listing panes when asked", async () => {
    mockExecFile(() => "9");

    await launchHerdrInTerminal(["session", "attach", "tmp-b"], { includeSession: false, newWindow: true });
    expect(spawnArgs()).toEqual(["cli", "spawn", "--new-window", "--", binary, "session", "attach", "tmp-b"]);
    expect(execCalls.some((call) => call.args[1] === "list")).toBe(false);
  });

  it("spawns into the requested window", async () => {
    mockExecFile(() => "9");

    await launchHerdrInTerminal(["session", "attach", "tmp-b"], { includeSession: false, windowId: "7" });
    expect(spawnArgs()).toEqual(["cli", "spawn", "--window-id", "7", "--", binary, "session", "attach", "tmp-b"]);
  });
});

describe("launchHerdrInTerminal in iTerm", () => {
  beforeEach(() => {
    preferences.customTerminalLauncher = undefined;
    preferences.terminalApplication = {
      bundleId: "com.googlecode.iterm2",
      name: "iTerm",
      path: "/Applications/iTerm.app",
    };
  });

  function script(): string | undefined {
    return execCalls.find((call) => call.path === "/usr/bin/osascript")?.args[1];
  }

  it("opens a tab in the current window by default", async () => {
    mockExecFile(() => "");

    await launchHerdrInTerminal();
    expect(script()).toContain("create tab with default profile");
  });

  it("opens a new window when asked", async () => {
    mockExecFile(() => "");

    await launchHerdrInTerminal([], { newWindow: true });
    expect(script()).toContain("create window with default profile");
    expect(script()).not.toContain("create tab");
  });
});

describe("launchHerdrInTerminal in Ghostty", () => {
  beforeEach(() => {
    preferences.customTerminalLauncher = undefined;
    preferences.terminalApplication = {
      bundleId: "com.mitchellh.ghostty",
      name: "Ghostty",
      path: "/Applications/Ghostty.app",
    };
  });

  function script(): string | undefined {
    return execCalls.find((call) => call.path === "/usr/bin/osascript")?.args[1];
  }

  it("opens a tab in the front window by default", async () => {
    mockExecFile(() => "opened");

    await launchHerdrInTerminal();
    expect(script()).toContain("new tab in front window with configuration cfg");
  });

  it("opens a new window when asked", async () => {
    mockExecFile(() => "opened");

    await launchHerdrInTerminal([], { newWindow: true });
    expect(script()).toContain("new window with configuration cfg");
    expect(script()).not.toContain("new tab");
  });
});
