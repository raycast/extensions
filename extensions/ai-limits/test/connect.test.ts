import { describe, expect, it, vi } from "vitest";
import {
  connectLocal,
  ConnectMethod,
  ConnectUi,
  isConnectOverridden,
  isFallbackOverridden,
  isStoppableConnect,
  LocalConnectMethod,
  LoginCheck,
  loginCheckFromError,
} from "../src/lib/connect";
import { Connections, mergeConnections } from "../src/lib/connections";
import { RunResult } from "../src/lib/deps";
import { claudeKeychainService } from "../src/lib/keychain";
import { fetchClaudeUsage } from "../src/lib/providers/claude";
import { fetchGeminiUsage } from "../src/lib/providers/gemini";
import { STATE_DB } from "../src/lib/providers/cursor";
import { CURSOR_BUNDLE_ID } from "../src/lib/sign-in";
import { ProviderError, Settings } from "../src/lib/types";
import { fakeDeps, FakeDeps, HOME, NOW } from "./fake-deps";

const SHELL = "/bin/zsh";
const SECURITY = "/usr/bin/security";
const OSASCRIPT = "/usr/bin/osascript";
const OPEN = "/usr/bin/open";
const CLAUDE_BIN = "/opt/homebrew/bin/claude";
const CODEX_BIN = "/opt/homebrew/bin/codex";
const GEMINI_BIN = "/opt/homebrew/bin/gemini";
const CLAUDE_CREDENTIALS = `${HOME}/.claude/.credentials.json`;
const CODEX_AUTH = `${HOME}/.codex/auth.json`;
const GEMINI_CREDENTIALS = `${HOME}/.gemini/oauth_creds.json`;
const GEMINI_LOAD_URL = "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist";
const GEMINI_QUOTA_URL = "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota";
const GEMINI_LOGIN = JSON.stringify({ access_token: "gemini-access", expiry_date: NOW + 3_600_000 });
const CURSOR_DB = `${HOME}${STATE_DB}`;
const POLL_TOTAL_MS = 10 * 60_000;
const POLL_INTERVAL_MS = 3_000;
const AUTOMATION_HINT = "Allow it in System Settings > Privacy & Security > Automation.";

const LOGIN_JSON = '{"claudeAiOauth":{"accessToken":"oauth-token-123"}}';
const RENEWED_JSON = '{"claudeAiOauth":{"accessToken":"renewed-token-456"}}';
const FOUND: RunResult = { exitCode: 0, stdout: `${LOGIN_JSON}\n`, stderr: "" };
const MISSING: RunResult = { exitCode: 44, stdout: "", stderr: "" };
const DENIED: RunResult = { exitCode: 128, stdout: "", stderr: "" };
const OK: RunResult = { exitCode: 0, stdout: "", stderr: "" };
const CURSOR_TOKEN = "eyJhbGciOiJub25lIn0.e30.sig";
// The modified date of the Keychain item as security prints it, and a later one for a login that was written again.
const WRITTEN = "20261014120000Z\\000";
const REWRITTEN = "20261014130000Z\\000";

function failure(stderr: string): RunResult {
  return { exitCode: 1, stdout: "", stderr };
}

// What `security find-generic-password` prints for an item without -w: the attributes, with the modified date on its
// "mdat" line. Connect reads that date as the Claude Code login marker.
function itemAttributes(modified: string): RunResult {
  return {
    exitCode: 0,
    stdout: [
      'keychain: "/Users/tester/Library/Keychains/login.keychain-db"',
      "version: 512",
      'class: "genp"',
      "attributes:",
      '    0x00000007 <blob>="Claude Code-credentials"',
      '    "acct"<blob>="tester"',
      '    "cdat"<timedate>=0x32303236303130313130303030305A00  "20260101100000Z\\000"',
      `    "mdat"<timedate>=0x32303236313031343132303030305A00  "${modified}"`,
      '    "svce"<blob>="Claude Code-credentials"',
      "",
    ].join("\n"),
    stderr: "",
  };
}
const ITEM = itemAttributes(WRITTEN);
const ITEM_REWRITTEN = itemAttributes(REWRITTEN);

// Answers the two Keychain reads Connect makes, by their arguments. A read with -w asks macOS for the password, and any
// other read is the item's attributes, which macOS answers without asking. Each kind is answered in turn.
function keychain(deps: FakeDeps, password: () => RunResult, attributes: () => RunResult) {
  deps.programs.push({ file: SECURITY, respond: (args) => (args.includes("-w") ? password() : attributes()) });
}

// Answers a program's calls in turn, so a second call can see what the first one changed. The last answer repeats.
function inOrder(...answers: RunResult[]): () => RunResult {
  let call = 0;
  return () => answers[Math.min(call++, answers.length - 1)];
}

// Each sign-in looks for its CLI on the user's PATH, and reads the config folders the user's shell sets, both from the
// login shell. fakeDeps has no SHELL, so the default /bin/zsh answers with a PATH that has Homebrew on it. The tools
// listed are the executables on that PATH, and `shellFolders` are the folders the shell sets (none by default).
function withTools(
  deps: FakeDeps,
  tools: string[] = [],
  shellFolders: { claudeConfigDir?: string; codexHome?: string } = {},
): FakeDeps {
  const folders = `${shellFolders.claudeConfigDir ?? ""}__AI_LIMITS__${shellFolders.codexHome ?? ""}`;
  deps.programs.push({
    file: SHELL,
    respond: {
      exitCode: 0,
      stdout: `__AI_LIMITS__/opt/homebrew/bin:/usr/bin__AI_LIMITS__${folders}__AI_LIMITS__`,
      stderr: "",
    },
  });
  for (const tool of tools) {
    deps.executables.add(tool);
  }
  return deps;
}

// The UI side of Connect. Saved patches are kept in order, and progress calls are recorded by title. Each save merges
// into `stored`, as the real UI does, and returns the result. By default the saved login is taken to work, so a test
// sets `verify` when it means a rejected one.
function testUi(overrides: Partial<ConnectUi> = {}, stored: Connections = {}) {
  const saved: Partial<Connections>[] = [];
  const progress = vi.fn();
  let connections = stored;
  const ui: ConnectUi = {
    progress,
    save: async (patch) => {
      saved.push(patch);
      connections = mergeConnections(connections, patch);
      return connections;
    },
    verify: async () => "ok",
    // A wait only happens when the login hasn't changed yet. A test that gets here without a clock to move would wait
    // forever, so it fails at once instead.
    sleep: async () => {
      throw new Error("Connect waited for a login change that never came");
    },
    ...overrides,
  };
  return { ui, progress, saved, connections: () => connections };
}

// Replaces the clock with one that only moves when a wait sleeps. A poll that never succeeds then ends at its timeout
// without any real waiting, and `sleeps` shows how long the waits added up to.
function steppingClock(deps: FakeDeps) {
  let now = NOW;
  deps.now = () => now;
  const sleeps: number[] = [];
  return {
    sleeps,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      now += ms;
    },
  };
}

// The script that the Terminal sign-in ran, or undefined when osascript was never run.
function terminalScript(deps: FakeDeps): string | undefined {
  return deps.runCalls.find((call) => call.file === OSASCRIPT)?.args[1];
}

// What Connect returns when it was stopped before it did anything. Nothing is saved, read or opened.
const STOPPED_OUTCOME = { kind: "failed", title: "Connect stopped", message: "Finish signing in, then refresh" };

// Answers the Keychain item's attributes, the only Keychain read connectLocal makes itself. Tests that fake verify have no
// password read to answer, since verify is the one that reads the password.
function keychainAttributes(deps: FakeDeps, ...answers: RunResult[]) {
  deps.programs.push({ file: SECURITY, respond: inOrder(...answers) });
}

// The password reads (`security -w`) a Connect made. These are the reads that can show macOS's access dialog.
function passwordReads(deps: FakeDeps): number {
  return deps.runCalls.filter((call) => call.args.includes("-w")).length;
}

const CLAUDE_USAGE_URL = "https://api.anthropic.com/api/oauth/usage";

// The check usage.tsx runs for Claude: the Claude Code login alone, read the way a refresh reads it. The usage request is
// answered by a fake route, so the Keychain is read exactly as it is in the app.
function claudeVerify(deps: FakeDeps): () => Promise<LoginCheck> {
  deps.routes.push({
    prefix: CLAUDE_USAGE_URL,
    respond: { body: { five_hour: { utilization: 10, resets_at: null } } },
  });
  return async () => {
    try {
      await fetchClaudeUsage(deps, { claudeKeychain: true });
      return "ok";
    } catch (error) {
      return loginCheckFromError(error);
    }
  };
}

// The check usage.tsx runs for Gemini: the Gemini CLI's login alone, read the way a refresh reads it.
function geminiVerify(deps: FakeDeps): () => Promise<LoginCheck> {
  return async () => {
    try {
      await fetchGeminiUsage(deps);
      return "ok";
    } catch (error) {
      return loginCheckFromError(error);
    }
  };
}

const CLAUDE: LocalConnectMethod = { kind: "claude" };
const CODEX: LocalConnectMethod = { kind: "codex" };
const GEMINI: LocalConnectMethod = { kind: "gemini" };
const CURSOR: LocalConnectMethod = { kind: "cursor" };

describe("connectLocal for Claude Code on macOS", () => {
  it("saves the Keychain setting before it reads the Keychain", async () => {
    const deps = withTools(fakeDeps());
    const { ui, saved } = testUi();
    let consentAtRead: number | undefined;
    deps.programs.push({
      file: SECURITY,
      respond: () => {
        consentAtRead = saved.length;
        return ITEM;
      },
    });

    await connectLocal(deps, CLAUDE, ui);

    expect(consentAtRead).toBe(1);
    expect(saved).toEqual([{ claudeKeychain: true, claudeConfigDir: "" }, { claudeKeychain: true }]);
  });

  it("connects without signing in when the Keychain login works, and reads no password itself", async () => {
    const deps = withTools(fakeDeps());
    keychainAttributes(deps, ITEM);
    const { ui, progress } = testUi();

    expect(await connectLocal(deps, CLAUDE, ui)).toEqual({ kind: "connected" });
    expect(progress).toHaveBeenCalledWith(
      "Connecting Claude Code",
      "If macOS asks for access to Claude Code's login, choose Always Allow",
    );
    expect(deps.runCalls.map((call) => call.file)).toEqual([SHELL, SECURITY]);
    expect(passwordReads(deps)).toBe(0);
  });

  it("reads the Keychain item for the config folder Claude Code uses", async () => {
    const deps = withTools(fakeDeps());
    deps.env.CLAUDE_CONFIG_DIR = "/work/claude";
    keychainAttributes(deps, ITEM);

    await connectLocal(deps, CLAUDE, testUi().ui);

    expect(deps.runCalls.find((call) => call.file === SECURITY)?.args).toEqual([
      "find-generic-password",
      "-s",
      claudeKeychainService("/work/claude"),
    ]);
  });

  it("signs in again when verify says the Keychain login was rejected, and connects once it changes", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    keychainAttributes(deps, ITEM, ITEM_REWRITTEN);
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const verify = vi.fn(async () => "broken" as const);

    expect(await connectLocal(deps, CLAUDE, testUi({ verify }).ui)).toEqual({ kind: "connected" });
    expect(verify).toHaveBeenCalledTimes(1);
    expect(terminalScript(deps)).toContain(
      `do script "'/usr/bin/env' '-u' 'CLAUDE_CONFIG_DIR' '${CLAUDE_BIN}' 'auth' 'login'"`,
    );
  });

  it("keeps polling while the Keychain item is unchanged, and gives up after 10 minutes", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    keychainAttributes(deps, ITEM);
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const clock = steppingClock(deps);

    expect(await connectLocal(deps, CLAUDE, testUi({ verify: async () => "broken", sleep: clock.sleep }).ui)).toEqual({
      kind: "failed",
      title: "Claude Code sign-in didn't finish",
    });
    expect(clock.sleeps.reduce((total, ms) => total + ms, 0)).toBe(POLL_TOTAL_MS);
    expect(clock.sleeps.every((ms) => ms === POLL_INTERVAL_MS)).toBe(true);
  });

  it("reads the item's date while it waits for the sign-in, and never reads the password itself", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    keychainAttributes(deps, ITEM);
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const clock = steppingClock(deps);

    await connectLocal(deps, CLAUDE, testUi({ verify: async () => "broken", sleep: clock.sleep }).ui);

    expect(passwordReads(deps)).toBe(0);
    // The marker read, then one read per check while it waits: more reads than polls in 10 minutes.
    const securityReads = deps.runCalls.filter((call) => call.file === SECURITY).length;
    expect(securityReads).toBeGreaterThan(POLL_TOTAL_MS / POLL_INTERVAL_MS);
  });

  it("fails with the Always Allow steps when verify reports macOS denied the read, without signing in", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    keychainAttributes(deps, ITEM);
    const verify = vi.fn(async () => "denied" as const);
    const { ui, saved, progress } = testUi({ verify });

    expect(await connectLocal(deps, CLAUDE, ui)).toEqual({
      kind: "failed",
      title: "macOS denied access to Claude Code's login",
      message: "Choose Connect again and click Always Allow",
    });
    expect(saved).toEqual([{ claudeKeychain: true, claudeConfigDir: "" }, { claudeKeychain: false }]);
    expect(terminalScript(deps)).toBeUndefined();
    expect(progress).not.toHaveBeenCalledWith("Finish signing in in Terminal", expect.anything());
  });

  it("turns the Keychain setting back off when macOS denies the read, so later refreshes don't ask again", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    keychain(deps, () => DENIED, inOrder(ITEM));
    const { ui, saved } = testUi({ verify: claudeVerify(deps) });

    expect(await connectLocal(deps, CLAUDE, ui)).toEqual({
      kind: "failed",
      title: "macOS denied access to Claude Code's login",
      message: "Choose Connect again and click Always Allow",
    });
    expect(saved).toEqual([{ claudeKeychain: true, claudeConfigDir: "" }, { claudeKeychain: false }]);
  });

  it("reads the Keychain password once in a full Connect with a working login, inside verify", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    keychain(deps, () => FOUND, inOrder(ITEM));
    const { ui } = testUi({ verify: claudeVerify(deps) });

    expect(await connectLocal(deps, CLAUDE, ui)).toEqual({ kind: "connected" });
    expect(passwordReads(deps)).toBe(1);
  });

  it("saves the Keychain setting on again when it connects, after a refresh turned it off during the sign-in", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    keychainAttributes(deps, MISSING, MISSING, ITEM);
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const harness = testUi({
      // A refresh that macOS refuses turns the setting off while Connect waits, and the login appears after that.
      sleep: async () => {
        await harness.ui.save({ claudeKeychain: false });
      },
    });

    expect(await connectLocal(deps, CLAUDE, harness.ui)).toEqual({ kind: "connected" });
    expect(harness.saved).toEqual([
      { claudeKeychain: true, claudeConfigDir: "" },
      { claudeKeychain: false },
      { claudeKeychain: true },
    ]);
    expect(harness.connections()).toEqual({ claudeKeychain: true });
  });

  it("does not save the Keychain setting again when Connect is stopped while it verifies the login", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    keychainAttributes(deps, ITEM);
    const controller = new AbortController();
    const { ui, saved } = testUi({
      signal: controller.signal,
      verify: async () => {
        controller.abort();
        return "ok";
      },
    });

    expect(await connectLocal(deps, CLAUDE, ui)).toEqual({ kind: "connected" });
    expect(saved).toEqual([{ claudeKeychain: true, claudeConfigDir: "" }]);
  });

  it("signs in in Terminal when the Keychain has no login, then connects once one appears", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    keychainAttributes(deps, MISSING, ITEM);
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const verify = vi.fn(async () => "ok" as const);
    const { ui, progress } = testUi({ verify });

    expect(await connectLocal(deps, CLAUDE, ui)).toEqual({ kind: "connected" });
    // With no login before the sign-in there is nothing to verify.
    expect(verify).not.toHaveBeenCalled();
    expect(progress).toHaveBeenCalledWith(
      "Finish signing in in Terminal",
      "Paste the code in Terminal if Claude Code asks for it",
    );
    expect(terminalScript(deps)).toContain(
      `do script "'/usr/bin/env' '-u' 'CLAUDE_CONFIG_DIR' '${CLAUDE_BIN}' 'auth' 'login'"`,
    );
  });

  it("signs in without verifying when the item's date can't be read, since there is no marker to compare", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    keychainAttributes(deps, failure("security: unexpected failure"));
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const verify = vi.fn(async () => "ok" as const);
    const clock = steppingClock(deps);

    expect(await connectLocal(deps, CLAUDE, testUi({ verify, sleep: clock.sleep }).ui)).toEqual({
      kind: "failed",
      title: "Claude Code sign-in didn't finish",
    });
    expect(verify).not.toHaveBeenCalled();
  });

  it("uses the credentials file as the login when the Keychain has no item", async () => {
    const deps = withTools(fakeDeps({ files: { [CLAUDE_CREDENTIALS]: "{}" } }), [CLAUDE_BIN]);
    deps.programs.push({ file: SECURITY, respond: MISSING });

    expect(await connectLocal(deps, CLAUDE, testUi().ui)).toEqual({ kind: "connected" });
    expect(deps.runCalls.map((call) => call.file)).toEqual([SHELL, SECURITY]);
  });

  it("signs in again when verify rejects the credentials file, and connects once the file changes", async () => {
    const deps = withTools(fakeDeps({ files: { [CLAUDE_CREDENTIALS]: "{}" } }), [CLAUDE_BIN]);
    deps.programs.push({ file: SECURITY, respond: MISSING });
    deps.programs.push({
      file: OSASCRIPT,
      respond: () => {
        deps.files.set(CLAUDE_CREDENTIALS, RENEWED_JSON);
        return OK;
      },
    });

    expect(await connectLocal(deps, CLAUDE, testUi({ verify: async () => "broken" }).ui)).toEqual({
      kind: "connected",
    });
  });

  it("turns the Keychain setting back off when Claude Code isn't installed, so no Disconnect is shown", async () => {
    const deps = withTools(fakeDeps());
    deps.programs.push({ file: SECURITY, respond: MISSING });
    const { ui, progress, saved } = testUi();

    expect(await connectLocal(deps, CLAUDE, ui)).toEqual({
      kind: "failed",
      title: "Claude Code isn't installed",
      message: "Install Claude Code, then choose Connect again",
      help: { title: "Install Claude Code", url: "https://code.claude.com/docs/en/setup" },
    });
    expect(saved).toEqual([{ claudeKeychain: true, claudeConfigDir: "" }, { claudeKeychain: false }]);
    expect(progress).not.toHaveBeenCalledWith("Finish signing in in Terminal", expect.anything());
  });

  it("runs the CLI through env with CLAUDE_CONFIG_DIR, so the login is written to the folder the extension reads", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    deps.env.CLAUDE_CONFIG_DIR = "/work/claude";
    deps.programs.push({ file: SECURITY, respond: MISSING });
    deps.programs.push({
      file: OSASCRIPT,
      respond: () => {
        deps.files.set("/work/claude/.credentials.json", "{}");
        return OK;
      },
    });

    expect(await connectLocal(deps, CLAUDE, testUi().ui)).toEqual({ kind: "connected" });
    expect(terminalScript(deps)).toContain(
      `do script "'/usr/bin/env' 'CLAUDE_CONFIG_DIR=/work/claude' '${CLAUDE_BIN}' 'auth' 'login'"`,
    );
  });

  it("removes CLAUDE_CONFIG_DIR from the command when the extension has an empty value, as when it is unset", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    deps.env.CLAUDE_CONFIG_DIR = "";
    deps.programs.push({ file: SECURITY, respond: MISSING });
    deps.programs.push({
      file: OSASCRIPT,
      respond: () => {
        deps.files.set(CLAUDE_CREDENTIALS, "{}");
        return OK;
      },
    });

    expect(await connectLocal(deps, CLAUDE, testUi().ui)).toEqual({ kind: "connected" });
    expect(terminalScript(deps)).toContain(
      `do script "'/usr/bin/env' '-u' 'CLAUDE_CONFIG_DIR' '${CLAUDE_BIN}' 'auth' 'login'"`,
    );
  });

  it("uses the config folder the user's shell sets over the extension's, and saves it with the Keychain setting", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN], { claudeConfigDir: "/work/shell-claude" });
    deps.env.CLAUDE_CONFIG_DIR = "/work/env-claude";
    deps.programs.push({ file: SECURITY, respond: MISSING });
    deps.programs.push({
      file: OSASCRIPT,
      respond: () => {
        deps.files.set("/work/shell-claude/.credentials.json", "{}");
        return OK;
      },
    });
    const { ui, saved } = testUi();

    expect(await connectLocal(deps, CLAUDE, ui)).toEqual({ kind: "connected" });
    expect(saved).toEqual([{ claudeKeychain: true, claudeConfigDir: "/work/shell-claude" }, { claudeKeychain: true }]);
    expect(deps.runCalls.find((call) => call.file === SECURITY)?.args).toEqual([
      "find-generic-password",
      "-s",
      claudeKeychainService("/work/shell-claude"),
    ]);
    expect(terminalScript(deps)).toContain(
      `do script "'/usr/bin/env' 'CLAUDE_CONFIG_DIR=/work/shell-claude' '${CLAUDE_BIN}' 'auth' 'login'"`,
    );
  });

  it("keeps the folder saved before when the login shell can't be asked, and reads the Keychain item for that folder", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: SHELL, respond: { exitCode: 1, stdout: "", stderr: "boom" } });
    deps.env.CLAUDE_CONFIG_DIR = "/work/env-claude";
    keychainAttributes(deps, ITEM);
    const { ui, saved, connections } = testUi({}, { claudeConfigDir: "/work/saved-claude" });

    expect(await connectLocal(deps, CLAUDE, ui)).toEqual({ kind: "connected" });
    expect(saved).toEqual([{ claudeKeychain: true, claudeConfigDir: undefined }, { claudeKeychain: true }]);
    expect(connections()).toEqual({ claudeKeychain: true, claudeConfigDir: "/work/saved-claude" });
    expect(deps.runCalls.find((call) => call.file === SECURITY)?.args).toEqual([
      "find-generic-password",
      "-s",
      claudeKeychainService("/work/saved-claude"),
    ]);
  });

  it("clears the folder saved before when the login shell answers that it isn't set, and uses the extension's folder", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    deps.env.CLAUDE_CONFIG_DIR = "/work/env-claude";
    keychainAttributes(deps, ITEM);
    const { ui, saved, connections } = testUi({}, { claudeConfigDir: "/work/saved-claude" });

    expect(await connectLocal(deps, CLAUDE, ui)).toEqual({ kind: "connected" });
    expect(saved).toEqual([{ claudeKeychain: true, claudeConfigDir: "" }, { claudeKeychain: true }]);
    expect(connections()).toEqual({ claudeKeychain: true });
    expect(deps.runCalls.find((call) => call.file === SECURITY)?.args).toEqual([
      "find-generic-password",
      "-s",
      claudeKeychainService("/work/env-claude"),
    ]);
  });

  it("says Raycast needs permission to control Terminal when macOS refuses it", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    deps.programs.push({ file: SECURITY, respond: MISSING });
    deps.programs.push({ file: OSASCRIPT, respond: failure("Not authorized to send Apple events (-1743)") });

    expect(await connectLocal(deps, CLAUDE, testUi().ui)).toEqual({
      kind: "failed",
      title: "Couldn't open Terminal",
      message: `Raycast isn't allowed to control Terminal. ${AUTOMATION_HINT}`,
    });
  });
});

describe("connectLocal for Claude Code on other platforms", () => {
  it("connects from the credentials file without touching the Keychain", async () => {
    const deps = withTools(fakeDeps({ files: { [CLAUDE_CREDENTIALS]: "{}" } }));
    deps.platform = "linux";
    const { ui, saved } = testUi();

    expect(await connectLocal(deps, CLAUDE, ui)).toEqual({ kind: "connected" });
    expect(deps.runCalls.map((call) => call.file)).toEqual([SHELL]);
    expect(saved).toEqual([{ claudeKeychain: true, claudeConfigDir: "" }, { claudeKeychain: true }]);
  });

  it("reads the credentials file from CLAUDE_CONFIG_DIR when it is set", async () => {
    const deps = fakeDeps({ files: { "/work/claude/.credentials.json": "{}" } });
    deps.platform = "linux";
    deps.env.CLAUDE_CONFIG_DIR = "/work/claude";

    expect(await connectLocal(deps, CLAUDE, testUi().ui)).toEqual({ kind: "connected" });
  });

  it("signs in in Terminal and connects once the credentials file appears", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    deps.platform = "linux";
    deps.programs.push({
      file: OSASCRIPT,
      respond: () => {
        deps.files.set(CLAUDE_CREDENTIALS, "{}");
        return OK;
      },
    });

    expect(await connectLocal(deps, CLAUDE, testUi().ui)).toEqual({ kind: "connected" });
  });

  it("keeps polling while the credentials file still holds the login verify rejected", async () => {
    const deps = withTools(fakeDeps({ files: { [CLAUDE_CREDENTIALS]: "{}" } }), [CLAUDE_BIN]);
    deps.platform = "linux";
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const clock = steppingClock(deps);

    expect(await connectLocal(deps, CLAUDE, testUi({ verify: async () => "broken", sleep: clock.sleep }).ui)).toEqual({
      kind: "failed",
      title: "Claude Code sign-in didn't finish",
    });
    expect(clock.sleeps.reduce((total, ms) => total + ms, 0)).toBe(POLL_TOTAL_MS);
  });

  it("connects once the credentials file changes after a rejected login", async () => {
    const deps = withTools(fakeDeps({ files: { [CLAUDE_CREDENTIALS]: "{}" } }), [CLAUDE_BIN]);
    deps.platform = "linux";
    deps.programs.push({
      file: OSASCRIPT,
      respond: () => {
        deps.files.set(CLAUDE_CREDENTIALS, RENEWED_JSON);
        return OK;
      },
    });

    expect(await connectLocal(deps, CLAUDE, testUi({ verify: async () => "broken" }).ui)).toEqual({
      kind: "connected",
    });
  });
});

describe("connectLocal for Codex", () => {
  it("connects without opening Terminal when the saved login works, and runs only the login shell", async () => {
    const deps = withTools(fakeDeps({ files: { [CODEX_AUTH]: "{}" } }), [CODEX_BIN]);
    const { ui, progress } = testUi();

    expect(await connectLocal(deps, CODEX, ui)).toEqual({ kind: "connected" });
    expect(deps.runCalls.map((call) => call.file)).toEqual([SHELL]);
    expect(progress).not.toHaveBeenCalled();
  });

  it("does not verify anything when there is no saved login", async () => {
    const deps = withTools(fakeDeps({ files: {} }), [CODEX_BIN]);
    deps.programs.push({
      file: OSASCRIPT,
      respond: () => {
        deps.files.set(CODEX_AUTH, "{}");
        return OK;
      },
    });
    const verify = vi.fn(async () => "ok" as const);

    expect(await connectLocal(deps, CODEX, testUi({ verify }).ui)).toEqual({ kind: "connected" });
    expect(verify).not.toHaveBeenCalled();
  });

  it("runs codex login in Terminal when verify rejects the login, and connects once auth.json changes", async () => {
    const deps = withTools(fakeDeps({ files: { [CODEX_AUTH]: "{}" } }), [CODEX_BIN]);
    deps.programs.push({
      file: OSASCRIPT,
      respond: () => {
        deps.files.set(CODEX_AUTH, '{"renewed":true}');
        return OK;
      },
    });
    const { ui, progress } = testUi({ verify: async () => "broken" });

    expect(await connectLocal(deps, CODEX, ui)).toEqual({ kind: "connected" });
    expect(progress).toHaveBeenCalledWith(
      "Finish signing in in Terminal",
      "Codex is waiting for its sign-in to finish",
    );
    expect(terminalScript(deps)).toContain(`do script "'/usr/bin/env' '-u' 'CODEX_HOME' '${CODEX_BIN}' 'login'"`);
  });

  it("runs codex login through env with CODEX_HOME, so auth.json is written to the folder the extension reads", async () => {
    const deps = withTools(fakeDeps(), [CODEX_BIN]);
    deps.env.CODEX_HOME = "/work/codex";
    deps.programs.push({
      file: OSASCRIPT,
      respond: () => {
        deps.files.set("/work/codex/auth.json", "{}");
        return OK;
      },
    });

    expect(await connectLocal(deps, CODEX, testUi().ui)).toEqual({ kind: "connected" });
    expect(terminalScript(deps)).toContain(
      `do script "'/usr/bin/env' 'CODEX_HOME=/work/codex' '${CODEX_BIN}' 'login'"`,
    );
  });

  it("takes CODEX_HOME from the user's shell over the extension's, reads that folder and saves it", async () => {
    const deps = withTools(fakeDeps({ files: { "/work/shell-codex/auth.json": "{}" } }), [CODEX_BIN], {
      codexHome: "/work/shell-codex",
    });
    deps.env.CODEX_HOME = "/work/env-codex";
    deps.programs.push({
      file: OSASCRIPT,
      respond: () => {
        deps.files.set("/work/shell-codex/auth.json", '{"renewed":true}');
        return OK;
      },
    });
    const { ui, saved } = testUi({ verify: async () => "broken" });

    expect(await connectLocal(deps, CODEX, ui)).toEqual({ kind: "connected" });
    expect(saved).toEqual([{ codexHome: "/work/shell-codex" }]);
    expect(terminalScript(deps)).toContain(
      `do script "'/usr/bin/env' 'CODEX_HOME=/work/shell-codex' '${CODEX_BIN}' 'login'"`,
    );
  });

  it("keeps the CODEX_HOME saved before when the login shell can't be asked, and reads that folder", async () => {
    const deps = fakeDeps({ files: { "/work/saved-codex/auth.json": "{}" } });
    deps.programs.push({ file: SHELL, respond: { exitCode: 1, stdout: "", stderr: "boom" } });
    deps.env.CODEX_HOME = "/work/env-codex";
    const { ui, saved, connections } = testUi({}, { codexHome: "/work/saved-codex" });

    expect(await connectLocal(deps, CODEX, ui)).toEqual({ kind: "connected" });
    expect(saved).toEqual([{ codexHome: undefined }]);
    expect(connections()).toEqual({ codexHome: "/work/saved-codex" });
  });

  it("clears the CODEX_HOME saved before when the login shell answers that it isn't set, and reads the extension's folder", async () => {
    const deps = withTools(fakeDeps({ files: { "/work/env-codex/auth.json": "{}" } }), [CODEX_BIN]);
    deps.env.CODEX_HOME = "/work/env-codex";
    const { ui, saved, connections } = testUi({}, { codexHome: "/work/saved-codex" });

    expect(await connectLocal(deps, CODEX, ui)).toEqual({ kind: "connected" });
    expect(saved).toEqual([{ codexHome: "" }]);
    expect(connections()).toEqual({});
  });

  it("runs codex login in Terminal and connects once auth.json appears", async () => {
    const deps = withTools(fakeDeps(), [CODEX_BIN]);
    deps.programs.push({
      file: OSASCRIPT,
      respond: () => {
        deps.files.set(CODEX_AUTH, "{}");
        return OK;
      },
    });

    expect(await connectLocal(deps, CODEX, testUi().ui)).toEqual({ kind: "connected" });
  });

  it("asks for the Codex CLI to be installed when it isn't on the PATH", async () => {
    expect(await connectLocal(withTools(fakeDeps()), CODEX, testUi().ui)).toEqual({
      kind: "failed",
      title: "Codex CLI isn't installed",
      help: { title: "Install Codex CLI", url: "https://developers.openai.com/codex/cli" },
    });
  });

  it("reports when Terminal can't be opened, with osascript's exit code and no script", async () => {
    const deps = withTools(fakeDeps(), [CODEX_BIN]);
    deps.programs.push({ file: OSASCRIPT, respond: failure("syntax error near it") });

    expect(await connectLocal(deps, CODEX, testUi().ui)).toEqual({
      kind: "failed",
      title: "Couldn't open Terminal",
      message: "Couldn't open Terminal (osascript exit 1)",
    });
  });

  it("gives up after 10 minutes while auth.json still holds the rejected login", async () => {
    const deps = withTools(fakeDeps({ files: { [CODEX_AUTH]: "{}" } }), [CODEX_BIN]);
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const clock = steppingClock(deps);

    expect(await connectLocal(deps, CODEX, testUi({ verify: async () => "broken", sleep: clock.sleep }).ui)).toEqual({
      kind: "failed",
      title: "Codex sign-in didn't finish",
    });
    expect(clock.sleeps.reduce((total, ms) => total + ms, 0)).toBe(POLL_TOTAL_MS);
    expect(clock.sleeps.every((ms) => ms === POLL_INTERVAL_MS)).toBe(true);
  });
});

describe("connectLocal for Gemini CLI", () => {
  it("connects without running anything when the saved login works", async () => {
    const deps = withTools(fakeDeps({ files: { [GEMINI_CREDENTIALS]: "{}" } }), [GEMINI_BIN]);

    expect(await connectLocal(deps, GEMINI, testUi().ui)).toEqual({ kind: "connected" });
    expect(deps.runCalls).toEqual([]);
  });

  it("asks for Gemini CLI to be installed when it isn't on the PATH", async () => {
    expect(await connectLocal(withTools(fakeDeps()), GEMINI, testUi().ui)).toEqual({
      kind: "failed",
      title: "Gemini CLI isn't installed",
      help: { title: "Install Gemini CLI", url: "https://github.com/google-gemini/gemini-cli" },
    });
  });

  it("reports when Terminal can't be controlled", async () => {
    const deps = withTools(fakeDeps(), [GEMINI_BIN]);
    deps.programs.push({ file: OSASCRIPT, respond: failure("Not authorized to send Apple events (-1743)") });

    expect(await connectLocal(deps, GEMINI, testUi().ui)).toEqual({
      kind: "failed",
      title: "Couldn't open Terminal",
      message: `Raycast isn't allowed to control Terminal. ${AUTOMATION_HINT}`,
    });
  });

  it("runs gemini by its absolute path in Terminal and connects once its login is written", async () => {
    const deps = withTools(fakeDeps(), [GEMINI_BIN]);
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const { ui, progress } = testUi({
      sleep: async () => {
        deps.files.set(GEMINI_CREDENTIALS, "{}");
      },
    });

    expect(await connectLocal(deps, GEMINI, ui)).toEqual({ kind: "connected" });
    expect(progress).toHaveBeenCalledWith(
      "Sign in to Gemini CLI in Terminal",
      "Choose Sign in with Google, then come back",
    );
    expect(terminalScript(deps)).toContain(`do script "'${GEMINI_BIN}'"`);
  });

  it("connects without opening Terminal when Google refuses quota for a personal account, since signing in again can't change that", async () => {
    const deps = withTools(fakeDeps({ files: { [GEMINI_CREDENTIALS]: GEMINI_LOGIN } }), [GEMINI_BIN]);
    deps.routes.push(
      { prefix: GEMINI_LOAD_URL, respond: { body: { ineligibleTiers: [{ reasonCode: "UNSUPPORTED_CLIENT" }] } } },
      { prefix: GEMINI_QUOTA_URL, respond: { status: 403, body: {} } },
    );
    const { ui, progress } = testUi({ verify: geminiVerify(deps) });

    expect(await connectLocal(deps, GEMINI, ui)).toEqual({ kind: "connected" });
    expect(progress).not.toHaveBeenCalled();
    expect(terminalScript(deps)).toBeUndefined();
  });

  it("gives up after 10 minutes without a login, checking every 3 seconds", async () => {
    const deps = withTools(fakeDeps(), [GEMINI_BIN]);
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const clock = steppingClock(deps);

    expect(await connectLocal(deps, GEMINI, testUi({ sleep: clock.sleep }).ui)).toEqual({
      kind: "failed",
      title: "Gemini CLI sign-in didn't finish",
    });
    expect(clock.sleeps.reduce((total, ms) => total + ms, 0)).toBe(POLL_TOTAL_MS);
    expect(clock.sleeps.every((ms) => ms === POLL_INTERVAL_MS)).toBe(true);
  });

  it("runs Terminal again when verify rejects the saved login, and connects once the login is replaced", async () => {
    const deps = withTools(fakeDeps({ files: { [GEMINI_CREDENTIALS]: "{}" } }), [GEMINI_BIN]);
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const { ui } = testUi({
      verify: async () => "broken",
      sleep: async () => {
        deps.files.set(GEMINI_CREDENTIALS, '{"renewed":true}');
      },
    });

    expect(await connectLocal(deps, GEMINI, ui)).toEqual({ kind: "connected" });
    expect(terminalScript(deps)).toBeDefined();
  });
});

describe("connectLocal for Cursor", () => {
  it("clears a saved Cursor session cookie once the app's login is confirmed, and not before", async () => {
    const deps = fakeDeps();
    deps.sqliteResults.set(CURSOR_DB, CURSOR_TOKEN);
    const { ui, saved } = testUi({
      verify: async () => {
        expect(saved).toEqual([]);
        return "ok";
      },
    });

    expect(await connectLocal(deps, CURSOR, ui)).toEqual({ kind: "connected" });
    expect(saved).toEqual([{ cursorCookie: "" }]);
  });

  it("connects without opening Cursor when the app's login works", async () => {
    const deps = fakeDeps();
    deps.sqliteResults.set(CURSOR_DB, `${CURSOR_TOKEN}\n`);
    const { ui, progress, saved } = testUi();

    expect(await connectLocal(deps, CURSOR, ui)).toEqual({ kind: "connected" });
    expect(deps.runCalls).toEqual([]);
    expect(progress).not.toHaveBeenCalled();
    expect(saved).toEqual([{ cursorCookie: "" }]);
  });

  it("keeps a saved cookie when a changed app login isn't confirmed by a request that succeeds", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: OPEN, respond: OK });
    const { ui, saved } = testUi({
      verify: async () => "broken",
      sleep: async () => {
        deps.sqliteResults.set(CURSOR_DB, CURSOR_TOKEN);
      },
    });

    expect(await connectLocal(deps, CURSOR, ui)).toEqual({ kind: "connected" });
    expect(saved).toEqual([]);
  });

  it("keeps a saved cookie when the app can't be reached to check its login, and does not open Cursor", async () => {
    const deps = fakeDeps();
    deps.sqliteResults.set(CURSOR_DB, CURSOR_TOKEN);
    const { ui, saved } = testUi({ verify: async () => "unreachable" });

    expect(await connectLocal(deps, CURSOR, ui)).toEqual({ kind: "connected" });
    expect(deps.runCalls).toEqual([]);
    expect(saved).toEqual([]);
  });

  it("does not clear the saved cookie when the Connect is stopped before the app's login is confirmed", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: OPEN, respond: OK });
    const controller = new AbortController();
    const { ui, saved } = testUi({
      signal: controller.signal,
      verify: async () => {
        controller.abort();
        return "ok";
      },
      sleep: async () => {
        deps.sqliteResults.set(CURSOR_DB, CURSOR_TOKEN);
      },
    });

    await connectLocal(deps, CURSOR, ui);
    expect(saved).toEqual([]);
  });

  it("keeps a saved cookie when Cursor isn't installed, since the cookie may still work", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: OPEN, respond: failure("Unable to find application") });
    const { ui, saved } = testUi();

    expect(await connectLocal(deps, CURSOR, ui)).toMatchObject({ kind: "failed", title: "Cursor isn't installed" });
    expect(saved).toEqual([]);
  });

  it("keeps a saved cookie when the app's sign-in doesn't finish", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: OPEN, respond: OK });
    const clock = steppingClock(deps);
    const { ui, saved } = testUi({ sleep: clock.sleep });

    expect(await connectLocal(deps, CURSOR, ui)).toEqual({ kind: "failed", title: "Cursor sign-in didn't finish" });
    expect(saved).toEqual([]);
  });

  it("clears the saved cookie once the app's sign-in finishes", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: OPEN, respond: OK });
    const { ui, saved } = testUi({
      sleep: async () => {
        deps.sqliteResults.set(CURSOR_DB, CURSOR_TOKEN);
      },
    });

    expect(await connectLocal(deps, CURSOR, ui)).toEqual({ kind: "connected" });
    expect(saved).toEqual([{ cursorCookie: "" }]);
  });

  it("opens Cursor when verify rejects the app's login, and connects once its token changes", async () => {
    const deps = fakeDeps();
    deps.sqliteResults.set(CURSOR_DB, "eyJhbGciOiJub25lIn0.old.sig");
    deps.programs.push({ file: OPEN, respond: OK });
    const { ui } = testUi({
      verify: async () => "broken",
      sleep: async () => {
        deps.sqliteResults.set(CURSOR_DB, "eyJhbGciOiJub25lIn0.new.sig");
      },
    });

    expect(await connectLocal(deps, CURSOR, ui)).toEqual({ kind: "connected" });
    expect(deps.runCalls.some((call) => call.file === OPEN)).toBe(true);
  });

  it("asks for Cursor to be downloaded when the app can't be opened", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: OPEN, respond: failure("Unable to find application") });

    expect(await connectLocal(deps, CURSOR, testUi().ui)).toEqual({
      kind: "failed",
      title: "Cursor isn't installed",
      help: { title: "Download Cursor", url: "https://cursor.com/download" },
    });
    expect(deps.runCalls).toEqual([{ file: OPEN, args: ["-b", CURSOR_BUNDLE_ID], options: undefined }]);
  });

  it("opens Cursor and connects once its login is stored", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: OPEN, respond: OK });
    const { ui, progress } = testUi({
      sleep: async () => {
        deps.sqliteResults.set(CURSOR_DB, CURSOR_TOKEN);
      },
    });

    expect(await connectLocal(deps, CURSOR, ui)).toEqual({ kind: "connected" });
    expect(progress).toHaveBeenCalledWith("Sign in to Cursor in the app", "Waiting for Cursor to finish signing in");
  });

  it("gives up after 10 minutes without a login", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: OPEN, respond: OK });
    const clock = steppingClock(deps);

    expect(await connectLocal(deps, CURSOR, testUi({ sleep: clock.sleep }).ui)).toEqual({
      kind: "failed",
      title: "Cursor sign-in didn't finish",
    });
    expect(clock.sleeps.reduce((total, ms) => total + ms, 0)).toBe(POLL_TOTAL_MS);
  });
});

describe("connectLocal when Connect is closed during a sign-in", () => {
  it("stops waiting for Terminal, says the sign-in is still running there, and leaves it to finish", async () => {
    const deps = withTools(fakeDeps(), [CODEX_BIN]);
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const controller = new AbortController();

    expect(
      await connectLocal(
        deps,
        CODEX,
        testUi({
          signal: controller.signal,
          sleep: async () => controller.abort(),
        }).ui,
      ),
    ).toEqual({
      kind: "failed",
      title: "Connect stopped",
      message: "Finish signing in, then refresh",
    });
    expect(terminalScript(deps)).toBeDefined();
  });

  it("stops waiting for the Cursor app the same way", async () => {
    const deps = fakeDeps();
    deps.programs.push({ file: OPEN, respond: OK });
    const controller = new AbortController();

    expect(
      await connectLocal(deps, CURSOR, testUi({ signal: controller.signal, sleep: async () => controller.abort() }).ui),
    ).toEqual({
      kind: "failed",
      title: "Connect stopped",
      message: "Finish signing in, then refresh",
    });
  });

  it("does not open Terminal when the Connect is stopped during the check, such as by Disconnect", async () => {
    const deps = withTools(fakeDeps({ files: { [CODEX_AUTH]: "{}" } }), [CODEX_BIN]);
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const controller = new AbortController();

    expect(
      await connectLocal(
        deps,
        CODEX,
        testUi({
          signal: controller.signal,
          verify: async () => {
            controller.abort();
            return "broken";
          },
        }).ui,
      ),
    ).toEqual({
      kind: "failed",
      title: "Connect stopped",
      message: "Finish signing in, then refresh",
    });
    expect(terminalScript(deps)).toBeUndefined();
  });

  it("does not open Cursor when the Connect is stopped during the check", async () => {
    const deps = fakeDeps();
    deps.sqliteResults.set(CURSOR_DB, "eyJhbGciOiJub25lIn0.old.sig");
    deps.programs.push({ file: OPEN, respond: OK });
    const controller = new AbortController();

    await connectLocal(
      deps,
      CURSOR,
      testUi({
        signal: controller.signal,
        verify: async () => {
          controller.abort();
          return "broken";
        },
      }).ui,
    );
    expect(deps.runCalls.some((call) => call.file === OPEN)).toBe(false);
  });

  it("does not report a stop when the sign-in simply timed out", async () => {
    const deps = withTools(fakeDeps(), [CODEX_BIN]);
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const clock = steppingClock(deps);

    expect(await connectLocal(deps, CODEX, testUi({ sleep: clock.sleep }).ui)).toEqual({
      kind: "failed",
      title: "Codex sign-in didn't finish",
    });
  });
});

describe("connectLocal when the Connect is already stopped", () => {
  it.each([
    ["Claude Code", CLAUDE],
    ["Codex", CODEX],
    ["Gemini CLI", GEMINI],
    ["Cursor", CURSOR],
  ] as const)("saves nothing, reads nothing and opens nothing for %s", async (_, method) => {
    const deps = withTools(
      fakeDeps({ files: { [CLAUDE_CREDENTIALS]: "{}", [CODEX_AUTH]: "{}", [GEMINI_CREDENTIALS]: "{}" } }),
      [CLAUDE_BIN, CODEX_BIN, GEMINI_BIN],
    );
    deps.sqliteResults.set(CURSOR_DB, CURSOR_TOKEN);
    keychainAttributes(deps, ITEM);
    deps.programs.push({ file: OPEN, respond: OK });
    deps.programs.push({ file: OSASCRIPT, respond: OK });
    const controller = new AbortController();
    controller.abort();
    const verify = vi.fn(async () => "ok" as const);
    const { ui, saved } = testUi({ signal: controller.signal, verify });

    expect(await connectLocal(deps, method, ui)).toEqual(STOPPED_OUTCOME);
    expect(saved).toEqual([]);
    expect(verify).not.toHaveBeenCalled();
    expect(deps.runCalls).toEqual([]);
  });

  it("does not verify when the Connect is stopped while it saves the Keychain setting", async () => {
    const deps = withTools(fakeDeps(), [CLAUDE_BIN]);
    keychainAttributes(deps, ITEM);
    const controller = new AbortController();
    const verify = vi.fn(async () => "ok" as const);
    const { ui } = testUi({
      signal: controller.signal,
      verify,
      save: async () => {
        controller.abort();
        return {};
      },
    });

    expect(await connectLocal(deps, CLAUDE, ui)).toEqual(STOPPED_OUTCOME);
    expect(verify).not.toHaveBeenCalled();
  });
});

describe("loginCheckFromError", () => {
  it("is denied for the keychain-denied code, even though that error is an auth error", () => {
    expect(loginCheckFromError(new ProviderError("auth", "denied", undefined, undefined, "keychain-denied"))).toBe(
      "denied",
    );
  });

  it("is ok for an account-unsupported error, since the login works and signing in again would change nothing", () => {
    expect(
      loginCheckFromError(new ProviderError("auth", "not served", undefined, undefined, "account-unsupported")),
    ).toBe("ok");
  });

  it.each(["auth", "not-connected", "parse"] as const)(
    "is broken for a %s error, which is a rejected, missing or unreadable login",
    (kind) => {
      expect(loginCheckFromError(new ProviderError(kind, "rejected"))).toBe("broken");
    },
  );

  it("is unreachable for an http error, which says nothing about the login", () => {
    expect(loginCheckFromError(new ProviderError("http", "unreachable"))).toBe("unreachable");
  });

  it("is unreachable for an error that isn't a ProviderError, such as no network", () => {
    expect(loginCheckFromError(new TypeError("fetch failed"))).toBe("unreachable");
  });
});

describe("isStoppableConnect", () => {
  it("is true for the local sign-ins, which stop when their signal aborts", () => {
    for (const method of [CLAUDE, CODEX, GEMINI, CURSOR]) {
      expect(isStoppableConnect(method)).toBe(true);
    }
  });

  it("is false for the OAuth sign-ins, which Raycast's browser flow runs and can't stop", () => {
    expect(isStoppableConnect({ kind: "github" })).toBe(false);
    expect(isStoppableConnect({ kind: "openrouter" })).toBe(false);
  });
});

describe("isConnectOverridden", () => {
  const apiKey = (field: "zaiApiKey" | "kimiApiKey"): ConnectMethod => ({
    kind: "api-key",
    field,
    keyUrl: "https://example.com/keys",
    keyPattern: /^.+$/,
    placeholder: "key",
  });

  it("hides Connect GitHub when a GitHub token is in the preferences", () => {
    expect(isConnectOverridden({ kind: "github" }, { githubToken: "ghp_pref" })).toBe(true);
    expect(isConnectOverridden({ kind: "github" }, { githubOAuthToken: "gho_saved" })).toBe(false);
  });

  it("hides Connect OpenRouter and its key form when an OpenRouter key is in the preferences", () => {
    expect(isConnectOverridden({ kind: "openrouter" }, { openrouterApiKey: "sk-or-pref" })).toBe(true);
    expect(isConnectOverridden({ kind: "openrouter" }, { openrouterApiKey: undefined })).toBe(false);
  });

  it("hides an API key Connect only for the key set in the preferences for that provider", () => {
    expect(isConnectOverridden(apiKey("zaiApiKey"), { zaiApiKey: "pref-key" })).toBe(true);
    expect(isConnectOverridden(apiKey("zaiApiKey"), { kimiApiKey: "other-key" })).toBe(false);
  });

  it("never hides the local sign-ins", () => {
    const preferences: Settings = { githubToken: "ghp_pref", openrouterApiKey: "sk-or-pref", claudeSessionKey: "sk" };

    expect(isConnectOverridden({ kind: "claude" }, preferences)).toBe(false);
    expect(isConnectOverridden({ kind: "codex" }, preferences)).toBe(false);
    expect(isConnectOverridden({ kind: "cursor" }, preferences)).toBe(false);
    expect(isConnectOverridden({ kind: "gemini" }, preferences)).toBe(false);
  });
});

describe("isFallbackOverridden", () => {
  it("hides the Claude Session Key fallback only when a session key is set in the preferences", () => {
    expect(isFallbackOverridden("claude", { claudeSessionKey: "sk-ant-pref" })).toBe(true);
    expect(isFallbackOverridden("claude", { cursorCookie: "cookie" })).toBe(false);
    expect(isFallbackOverridden("claude", {})).toBe(false);
  });

  it("hides the Cursor Session Cookie fallback only when a cookie is set in the preferences", () => {
    expect(isFallbackOverridden("cursor", { cursorCookie: "cookie-pref" })).toBe(true);
    expect(isFallbackOverridden("cursor", { claudeSessionKey: "sk-ant-pref" })).toBe(false);
    expect(isFallbackOverridden("cursor", {})).toBe(false);
  });

  it("never hides a fallback for a provider that has none", () => {
    const preferences: Settings = {
      claudeSessionKey: "sk-ant-pref",
      cursorCookie: "cookie-pref",
      openrouterApiKey: "sk-or",
    };

    expect(isFallbackOverridden("codex", preferences)).toBe(false);
    expect(isFallbackOverridden("openrouter", preferences)).toBe(false);
  });
});
