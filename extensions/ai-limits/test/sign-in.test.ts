import { describe, expect, it, vi } from "vitest";
import {
  CLI_SIGN_IN,
  CURSOR_BUNDLE_ID,
  findExecutable,
  openApp,
  openInTerminal,
  readCodexLogin,
  readCursorLogin,
  readGeminiLogin,
  resolveUserEnv,
  waitFor,
} from "../src/lib/sign-in";
import { TOKEN_QUERY } from "../src/lib/providers/cursor";
import { fakeDeps, HOME } from "./fake-deps";

// The PATH segments added after whatever the login shell (or the fallback) provided, in the order they are appended.
const APPENDED = `${HOME}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin`;
const DONE = { exitCode: 0, stdout: "", stderr: "" };
const OSASCRIPT = "/usr/bin/osascript";

// What the login shell prints for the extension: the PATH, then CLAUDE_CONFIG_DIR and CODEX_HOME, each between markers.
function shellOutput(path: string, claudeConfigDir = "", codexHome = ""): string {
  return `__AI_LIMITS__${path}__AI_LIMITS__${claudeConfigDir}__AI_LIMITS__${codexHome}__AI_LIMITS__`;
}

describe("resolveUserEnv", () => {
  it("takes the PATH between the markers, so a banner printed before it is ignored", async () => {
    const deps = fakeDeps();
    deps.programs.push({
      file: "/bin/zsh",
      respond: { exitCode: 0, stdout: `Welcome back!\n${shellOutput("/opt/x/bin:/usr/bin")}\n`, stderr: "" },
    });

    expect((await resolveUserEnv(deps)).path).toBe(
      `/opt/x/bin:/usr/bin:${HOME}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/bin`,
    );
  });

  it("asks the default shell for its PATH and folders with an interactive login command and a 5 second timeout", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: "/bin/zsh", respond: DONE });

    await resolveUserEnv(deps);

    expect(deps.runCalls).toEqual([
      {
        file: "/bin/zsh",
        args: [
          "-ilc",
          'printf "__AI_LIMITS__%s__AI_LIMITS__%s__AI_LIMITS__%s__AI_LIMITS__" "$PATH" "$CLAUDE_CONFIG_DIR" "$CODEX_HOME"',
        ],
        options: { timeoutMs: 5_000 },
      },
    ]);
  });

  it("reads CLAUDE_CONFIG_DIR and CODEX_HOME from the shell, with surrounding spaces trimmed", async () => {
    const deps = fakeDeps();
    deps.programs.push({
      file: "/bin/zsh",
      respond: {
        exitCode: 0,
        stdout: shellOutput("/usr/bin", " /Volumes/work/claude ", "/Volumes/work/codex"),
        stderr: "",
      },
    });

    expect(await resolveUserEnv(deps)).toMatchObject({
      claudeConfigDir: "/Volumes/work/claude",
      codexHome: "/Volumes/work/codex",
    });
  });

  it("reads the folders the same way from bash, zsh and fish, and gives an empty string for one the shell doesn't set", async () => {
    for (const shell of ["/bin/bash", "/bin/zsh", "/usr/local/bin/fish"]) {
      const set = fakeDeps();
      set.env.SHELL = shell;
      set.programs.push({
        file: shell,
        respond: { exitCode: 0, stdout: shellOutput("/usr/bin", "/work/claude", "/work/codex"), stderr: "" },
      });
      expect(await resolveUserEnv(set)).toMatchObject({ claudeConfigDir: "/work/claude", codexHome: "/work/codex" });

      // The shell answered, so "" tells Connect to clear a folder saved before.
      const unset = fakeDeps();
      unset.env.SHELL = shell;
      unset.programs.push({ file: shell, respond: { exitCode: 0, stdout: shellOutput("/usr/bin"), stderr: "" } });
      expect(await resolveUserEnv(unset)).toMatchObject({ claudeConfigDir: "", codexHome: "" });
    }
  });

  it("runs the shell from SHELL when it is an absolute path to bash, zsh, fish or sh", async () => {
    for (const shell of ["/bin/bash", "/usr/local/bin/fish", "/bin/sh"]) {
      const deps = fakeDeps();
      deps.env.SHELL = shell;
      deps.programs.push({ file: shell, respond: DONE });

      await resolveUserEnv(deps);

      expect(deps.runCalls[0].file).toBe(shell);
    }
  });

  it("uses zsh when SHELL is another shell, or a relative path", async () => {
    for (const shell of ["/bin/tcsh", "zsh", "/usr/bin/notsh"]) {
      const deps = fakeDeps();
      deps.env.SHELL = shell;
      deps.programs.push({ file: "/bin/zsh", respond: DONE });

      await resolveUserEnv(deps);

      expect(deps.runCalls[0].file).toBe("/bin/zsh");
    }
  });

  it("joins fish's PATH list with colons, since fish's \"$PATH\" would join it with spaces", async () => {
    const deps = fakeDeps();
    deps.env.SHELL = "/usr/local/bin/fish";
    deps.programs.push({
      file: "/usr/local/bin/fish",
      respond: { exitCode: 0, stdout: shellOutput("/opt/x/bin:/usr/bin"), stderr: "" },
    });

    const env = await resolveUserEnv(deps);

    expect(deps.runCalls[0].args).toEqual([
      "-ilc",
      'printf "__AI_LIMITS__%s__AI_LIMITS__%s__AI_LIMITS__%s__AI_LIMITS__" (string join : $PATH) "$CLAUDE_CONFIG_DIR" "$CODEX_HOME"',
    ]);
    expect(env.path).toBe(`/opt/x/bin:/usr/bin:${HOME}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/bin`);
  });

  it("falls back to the process PATH when the shell exits non-zero", async () => {
    const deps = fakeDeps();
    deps.env.PATH = "/custom/bin:/usr/bin";
    deps.programs.push({ file: "/bin/zsh", respond: { exitCode: 1, stdout: "", stderr: "boom" } });

    expect((await resolveUserEnv(deps)).path).toBe(
      `/custom/bin:/usr/bin:${HOME}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/bin`,
    );
  });

  it("leaves both folders undefined when the shell fails, so a folder saved before is kept", async () => {
    const deps = fakeDeps();
    deps.env.CLAUDE_CONFIG_DIR = "/process/claude";
    deps.env.CODEX_HOME = "/process/codex";
    deps.programs.push({
      file: "/bin/zsh",
      respond: { exitCode: 1, stdout: shellOutput("/usr/bin", "/work/claude", "/work/codex"), stderr: "boom" },
    });

    const env = await resolveUserEnv(deps);

    expect(env.claudeConfigDir).toBeUndefined();
    expect(env.codexHome).toBeUndefined();
  });

  it("falls back to the process PATH when the shell can't be started, with both folders undefined", async () => {
    const deps = fakeDeps();
    deps.env.PATH = "/custom/bin:/usr/bin";

    const env = await resolveUserEnv(deps);

    expect(env.path).toBe(`/custom/bin:/usr/bin:${HOME}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/bin`);
    expect(env.claudeConfigDir).toBeUndefined();
    expect(env.codexHome).toBeUndefined();
  });

  it("falls back to the process PATH when the output has no marker, with both folders undefined", async () => {
    const deps = fakeDeps();
    deps.env.PATH = "/custom/bin";
    deps.programs.push({ file: "/bin/zsh", respond: { exitCode: 0, stdout: "/opt/x/bin", stderr: "" } });

    const env = await resolveUserEnv(deps);

    expect(env.path).toBe(`/custom/bin:${APPENDED}`);
    expect(env.claudeConfigDir).toBeUndefined();
    expect(env.codexHome).toBeUndefined();
  });

  it("appends the well-known directories, including ~/.local/bin, when the PATH lacks them", async () => {
    const deps = fakeDeps();
    deps.env.PATH = "/custom/bin";

    expect((await resolveUserEnv(deps)).path).toBe(`/custom/bin:${APPENDED}`);
  });

  it("keeps each directory once, at its first position, and drops empty entries", async () => {
    const deps = fakeDeps();
    deps.programs.push({
      file: "/bin/zsh",
      respond: { exitCode: 0, stdout: shellOutput("/usr/bin:/opt/homebrew/bin:/usr/bin::/a"), stderr: "" },
    });

    expect((await resolveUserEnv(deps)).path).toBe(
      `/usr/bin:/opt/homebrew/bin:/a:${HOME}/.local/bin:/usr/local/bin:/bin`,
    );
  });
});

describe("findExecutable", () => {
  it("returns the first directory in the PATH that holds an executable of that name", async () => {
    const deps = fakeDeps();
    deps.executables.add("/usr/bin/codex");
    deps.executables.add("/opt/homebrew/bin/codex");

    expect(await findExecutable(deps, "codex", "/opt/homebrew/bin:/usr/bin")).toBe("/opt/homebrew/bin/codex");
  });

  it("skips a directory that has no executable of that name", async () => {
    const deps = fakeDeps();
    deps.executables.add("/usr/bin/codex");

    expect(await findExecutable(deps, "codex", "/opt/homebrew/bin:/usr/bin")).toBe("/usr/bin/codex");
  });

  it("ignores empty PATH entries rather than looking in the current directory", async () => {
    const deps = fakeDeps();
    deps.executables.add("/codex");
    deps.executables.add("/usr/bin/codex");

    expect(await findExecutable(deps, "codex", "::/usr/bin")).toBe("/usr/bin/codex");
  });

  it("returns undefined when no directory holds it", async () => {
    expect(await findExecutable(fakeDeps(), "codex", "/opt/homebrew/bin:/usr/bin")).toBeUndefined();
  });

  it("checks ~/.claude/local for claude after the PATH, for older Claude Code installs", async () => {
    const deps = fakeDeps();
    deps.executables.add(`${HOME}/.claude/local/claude`);

    expect(await findExecutable(deps, "claude", "/usr/bin")).toBe(`${HOME}/.claude/local/claude`);
  });

  it("prefers claude on the PATH over ~/.claude/local", async () => {
    const deps = fakeDeps();
    deps.executables.add(`${HOME}/.claude/local/claude`);
    deps.executables.add("/opt/homebrew/bin/claude");

    expect(await findExecutable(deps, "claude", "/opt/homebrew/bin")).toBe("/opt/homebrew/bin/claude");
  });

  it("checks ~/.claude/local only for claude", async () => {
    const deps = fakeDeps();
    deps.executables.add(`${HOME}/.claude/local/codex`);

    expect(await findExecutable(deps, "codex", "/usr/bin")).toBeUndefined();
  });
});

describe("CLI_SIGN_IN", () => {
  it("has the sign-in command for Claude and Codex", () => {
    expect(CLI_SIGN_IN.claude).toMatchObject({ name: "claude", args: ["auth", "login"] });
    expect(CLI_SIGN_IN.codex).toMatchObject({ name: "codex", args: ["login"] });
  });
});

describe("openInTerminal", () => {
  // The AppleScript that opens Terminal and runs `command` in it, with the command already escaped.
  const script = (command: string) =>
    ['tell application "Terminal"', "activate", `do script "${command}"`, "end tell"].join("\n");

  it("runs the executable in a new Terminal window, with a 60 second timeout for the Automation prompt", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: OSASCRIPT, respond: DONE });

    await openInTerminal(deps, ["/opt/homebrew/bin/gemini"]);

    expect(deps.runCalls).toEqual([
      { file: OSASCRIPT, args: ["-e", script("'/opt/homebrew/bin/gemini'")], options: { timeoutMs: 60_000 } },
    ]);
  });

  it("quotes each argument for the shell, so a path with a space and a single quote runs as one word", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: OSASCRIPT, respond: DONE });

    await openInTerminal(deps, ["/Users/Jo Ann/it's/claude", "auth", "login"]);

    // The single quote is closed, escaped and reopened, and the backslash that does it is doubled for AppleScript.
    expect(deps.runCalls[0].args[1]).toBe(script(String.raw`'/Users/Jo Ann/it'\\''s/claude' 'auth' 'login'`));
  });

  it("escapes double quotes and backslashes for AppleScript, after the shell quoting", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: OSASCRIPT, respond: DONE });

    await openInTerminal(deps, [String.raw`echo "hi" \ done`]);

    expect(deps.runCalls[0].args[1]).toBe(script(String.raw`'echo \"hi\" \\ done'`));
  });

  it("says Raycast needs permission to control Terminal when osascript reports -1743", async () => {
    const deps = fakeDeps();
    deps.programs.push({
      file: OSASCRIPT,
      respond: { exitCode: 1, stdout: "", stderr: "Not authorized to send Apple events (-1743)\n" },
    });

    await expect(openInTerminal(deps, ["gemini"])).rejects.toThrow(
      "Raycast isn't allowed to control Terminal. Allow it in System Settings > Privacy & Security > Automation.",
    );
  });

  it("reports any other failure by exit code, without the script or osascript's text", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: OSASCRIPT, respond: { exitCode: 2, stdout: "", stderr: "syntax error near it" } });

    const error = await openInTerminal(deps, ["gemini"]).catch((caught: unknown) => caught);

    expect((error as Error).message).toBe("Couldn't open Terminal (osascript exit 2)");
  });

  it("reports a run that can't finish without the script in the message", async () => {
    const error = await openInTerminal(fakeDeps(), ["gemini"]).catch((caught: unknown) => caught);

    expect((error as Error).message).toBe("Couldn't open Terminal (osascript didn't finish)");
  });
});

describe("openApp", () => {
  it("launches the app by bundle id and returns true when open exits 0", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: "/usr/bin/open", respond: DONE });

    expect(await openApp(deps, CURSOR_BUNDLE_ID)).toBe(true);
    expect(deps.runCalls).toEqual([{ file: "/usr/bin/open", args: ["-b", CURSOR_BUNDLE_ID] }]);
  });

  it("returns false when open exits non-zero, as it does for an app that isn't installed", async () => {
    const deps = fakeDeps();
    deps.programs.push({
      file: "/usr/bin/open",
      respond: { exitCode: 1, stdout: "", stderr: "Unable to find application" },
    });

    expect(await openApp(deps, CURSOR_BUNDLE_ID)).toBe(false);
  });

  it("returns false when open can't be run", async () => {
    expect(await openApp(fakeDeps(), CURSOR_BUNDLE_ID)).toBe(false);
  });
});

// A clock that only moves when the code sleeps, so waitFor runs instantly and its timing can be checked exactly.
function fakeClock() {
  let time = 0;
  return {
    now: () => time,
    sleep: async (ms: number) => {
      time += ms;
    },
  };
}

describe("waitFor", () => {
  it("returns true as soon as the check passes, without waiting longer", async () => {
    const clock = fakeClock();
    let calls = 0;

    const found = await waitFor(
      async () => {
        calls += 1;
        return calls === 3;
      },
      { intervalMs: 100, timeoutMs: 1_000, ...clock },
    );

    expect(found).toBe(true);
    expect(calls).toBe(3);
    expect(clock.now()).toBe(200);
  });

  it("returns false when the timeout passes first, and the last wait stops at the deadline", async () => {
    const clock = fakeClock();
    let calls = 0;

    const found = await waitFor(
      async () => {
        calls += 1;
        return false;
      },
      { intervalMs: 100, timeoutMs: 350, ...clock },
    );

    expect(found).toBe(false);
    // Checks at 0, 100, 200, 300 and once more at the 350ms deadline.
    expect(calls).toBe(5);
    expect(clock.now()).toBe(350);
  });

  it("returns false as soon as the signal aborts, without checking again", async () => {
    const clock = fakeClock();
    const controller = new AbortController();
    let calls = 0;

    const found = await waitFor(
      async () => {
        calls += 1;
        return false;
      },
      {
        intervalMs: 100,
        timeoutMs: 1_000,
        now: clock.now,
        sleep: async (ms) => {
          await clock.sleep(ms);
          controller.abort();
        },
        signal: controller.signal,
      },
    );

    expect(found).toBe(false);
    expect(calls).toBe(1);
  });

  it("stops the default wait as soon as the signal aborts, rather than sleeping out the interval", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10);
    let calls = 0;
    const started = Date.now();

    const found = await waitFor(
      async () => {
        calls += 1;
        return false;
      },
      { intervalMs: 60_000, timeoutMs: 120_000, now: Date.now, signal: controller.signal },
    );

    expect(found).toBe(false);
    expect(calls).toBe(1);
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("removes its abort listener when each default wait ends", async () => {
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, "addEventListener");
    const remove = vi.spyOn(controller.signal, "removeEventListener");

    await waitFor(async () => false, { intervalMs: 10, timeoutMs: 35, now: Date.now, signal: controller.signal });

    expect(add).toHaveBeenCalled();
    expect(remove.mock.calls.length).toBe(add.mock.calls.length);
  });

  it("does not check at all when the signal has already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;

    const found = await waitFor(
      async () => {
        calls += 1;
        return true;
      },
      { intervalMs: 100, timeoutMs: 1_000, ...fakeClock(), signal: controller.signal },
    );

    expect(found).toBe(false);
    expect(calls).toBe(0);
  });

  it("counts a check that throws as not yet passed, and keeps polling", async () => {
    const clock = fakeClock();
    let calls = 0;

    const found = await waitFor(
      async () => {
        calls += 1;
        if (calls < 3) {
          throw new Error("not signed in yet");
        }
        return true;
      },
      { intervalMs: 100, timeoutMs: 1_000, ...clock },
    );

    expect(found).toBe(true);
    expect(calls).toBe(3);
  });

  it("returns false, without rejecting, when the check always throws", async () => {
    const found = await waitFor(
      async () => {
        throw new Error("sqlite is locked");
      },
      { intervalMs: 100, timeoutMs: 250, ...fakeClock() },
    );

    expect(found).toBe(false);
  });
});

describe("readCodexLogin", () => {
  it("returns the text of auth.json under ~/.codex when no folder is given", async () => {
    const deps = fakeDeps({ files: { [`${HOME}/.codex/auth.json`]: '{"tokens":{}}' } });

    expect(await readCodexLogin(deps, undefined)).toBe('{"tokens":{}}');
  });

  it("is null when there is no login file", async () => {
    expect(await readCodexLogin(fakeDeps(), undefined)).toBeNull();
  });

  it("reads auth.json from the folder it is given, instead of ~/.codex", async () => {
    const deps = fakeDeps({ files: { [`${HOME}/.codex/auth.json`]: "{}" } });

    expect(await readCodexLogin(deps, "/Volumes/work/codex")).toBeNull();

    deps.files.set("/Volumes/work/codex/auth.json", '{"work":true}');
    expect(await readCodexLogin(deps, "/Volumes/work/codex")).toBe('{"work":true}');
  });

  it("ignores CODEX_HOME in the environment, since Connect passes in the folder it resolved", async () => {
    const deps = fakeDeps({ files: { [`${HOME}/.codex/auth.json`]: "{}" } });
    deps.env.CODEX_HOME = "/Volumes/work/codex";

    expect(await readCodexLogin(deps, undefined)).toBe("{}");
  });

  it("is null when the file can't be read", async () => {
    const deps = fakeDeps();
    deps.readFile = async () => {
      throw new Error("EACCES: permission denied");
    };

    expect(await readCodexLogin(deps, undefined)).toBeNull();
  });
});

describe("readGeminiLogin", () => {
  it("returns the text of oauth_creds.json", async () => {
    const deps = fakeDeps({ files: { [`${HOME}/.gemini/oauth_creds.json`]: '{"refresh_token":"r"}' } });

    expect(await readGeminiLogin(deps)).toBe('{"refresh_token":"r"}');
  });

  it("is null when there is no login file", async () => {
    expect(await readGeminiLogin(fakeDeps())).toBeNull();
  });
});

describe("readCursorLogin", () => {
  const DB_PATH = `${HOME}/Library/Application Support/Cursor/User/globalStorage/state.vscdb`;

  it("returns the access token from the app's state database, trimmed", async () => {
    const deps = fakeDeps();
    deps.sqliteResults.set(DB_PATH, "eyJhbGciOiJub25lIn0.e30.sig\n");

    expect(await readCursorLogin(deps)).toBe("eyJhbGciOiJub25lIn0.e30.sig");
    expect(deps.sqliteCalls).toEqual([{ dbPath: DB_PATH, sql: TOKEN_QUERY }]);
  });

  it("is null when the token is empty", async () => {
    const deps = fakeDeps();
    deps.sqliteResults.set(DB_PATH, "  \n");

    expect(await readCursorLogin(deps)).toBeNull();
  });

  it("is null when the database can't be opened, as when the app was never signed in", async () => {
    expect(await readCursorLogin(fakeDeps())).toBeNull();
  });
});
