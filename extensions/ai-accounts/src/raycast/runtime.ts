import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Color, environment, getPreferenceValues, launchCommand, LaunchType } from "@raycast/api";
import { createDeeplink, runAppleScript } from "@raycast/utils";
import { fetchClaude, switchClaude } from "../lib/claude";
import { addClaudeAccountCommand, defaultClaudeLoginPaths } from "../lib/claudeLogins";
import {
  CODEX_TARGET_NOT_SAVED,
  CodexPaths,
  codexSwitchRoute,
  defaultCodexPaths,
  fetchCodex,
  readLiveIdentity,
  readManagedStore,
} from "../lib/codex";
import { codexDaemonControl, preflightCodexSwitch, switchCodexDirect } from "../lib/codexSwitch";
import { childEnv, resolveExecutable, runQuery, sanitize } from "../lib/exec";
import { FlowDeps, Level, remainingLevel, Switcher, SwitchOutcome } from "../lib/flow";
import { Account, SwitchRequest, SwitchResult } from "../lib/model";
import { Config, RawPreferences, toConfig } from "../lib/prefs";
import { readSnapshot, upsertOperation } from "../lib/store";

// Raycast wiring: preferences, state directory, fetchers/switchers, and the launch helpers
// the list and menu bar share. Executable paths come only from preferences, never from launch context.

export function getConfig(): Config {
  return toConfig(getPreferenceValues<RawPreferences>());
}

export function stateDir(): string {
  return environment.supportPath;
}

/** "~" expansion for paths handed to libs that do not expand them; bad paths pass through so the lib reports them. */
function expandPath(p: string): string {
  try {
    return resolveExecutable(p);
  } catch {
    return p;
  }
}

export const CODEX_NOT_SAVED = CODEX_TARGET_NOT_SAVED;

/**
 * Direct switching swaps <codexHome>/auth.json and restarts the daemon, and the daemon is always the one of
 * ~/.codex (child processes get no CODEX_HOME). Refuse when the read side points at another home.
 */
function codexHomeProblem(paths: CodexPaths): string | null {
  if (path.resolve(paths.codexHome) === path.join(os.homedir(), ".codex")) return null;
  return "CODEX_HOME points outside ~/.codex, which direct switching does not support; switch from CodexBar's menu.";
}

/**
 * Read-only check before a direct Codex switch, so the list can explain a refusal without launching it.
 * Returns the reason a switch would be refused, or null when it looks possible (the switch re-checks).
 */
export function codexPreflightProblem(account: Account, cfg: Config): string | null {
  if (account.provider !== "codex" || cfg.codexSwitchMode !== "direct") return null;
  const target = account.switchTarget;
  if (!target || target.kind !== "codex-managed") return CODEX_NOT_SAVED;
  const paths = defaultCodexPaths();
  const homeProblem = codexHomeProblem(paths);
  if (homeProblem) return homeProblem;
  const req: SwitchRequest = {
    requestId: "preflight",
    provider: "codex",
    targetKey: account.key,
    expectedEmail: account.email,
    targetLabel: account.label,
    via: "list",
  };
  const result = preflightCodexSwitch(req, {
    paths,
    daemon: codexDaemonControl(expandPath(cfg.codexPath), { codexHome: paths.codexHome }),
    managedHomePath: target.homePath,
  });
  return result.ok ? null : result.reason;
}

/**
 * Whether a Codex request is a CodexBar hand-off: hand-off mode, or a direct switch known to be refused now
 * (live login not saved in CodexBar, target not saved). Decided from disk, not the snapshot's switchBlocked.
 * Never throws: when unsure it answers "direct" and the guarded switch decides.
 */
export function codexHandoffFor(req: SwitchRequest, cfg: Config): { reason: string | null } | null {
  if (req.provider !== "codex") return null;
  try {
    const paths = defaultCodexPaths();
    const route = codexSwitchRoute({
      mode: cfg.codexSwitchMode,
      target: readSnapshot(stateDir()).providers.codex.accounts.find((a) => a.key === req.targetKey),
      expectedEmail: req.expectedEmail,
      live: cfg.codexSwitchMode === "codexbar" ? null : readLiveIdentity(paths),
      managed: cfg.codexSwitchMode === "codexbar" ? [] : readManagedStore(paths).accounts,
    });
    return route.kind === "handoff" ? { reason: route.reason } : null;
  } catch {
    return null;
  }
}

/**
 * Open CodexBar for the user to finish a switch there. Runs outside the switch flow: it takes no provider lock
 * (a running refresh must not delay it) and changes no credentials. The operation record is still written so
 * the list, which follows its request by id, can report the hand-off.
 */
export async function handOffToCodexBar(req: SwitchRequest, reason: string | null): Promise<SwitchResult> {
  const label = sanitize(req.targetLabel, 120) || "the account";
  let result: SwitchResult;
  try {
    await openCodexBar();
    const why = reason ? `${sanitize(reason).replace(/[.!?]?$/, ".")} ` : "";
    result = { state: "handoff", message: `${why}Pick ${label} in CodexBar → Codex → System Account.` };
  } catch (error) {
    result = {
      state: "failed",
      message: `Could not open CodexBar: ${sanitize(error instanceof Error ? error.message : error) || "unknown error"}`,
    };
  }
  try {
    const now = new Date().toISOString();
    await upsertOperation(stateDir(), {
      requestId: req.requestId,
      provider: req.provider,
      targetKey: req.targetKey,
      targetLabel: sanitize(req.targetLabel),
      state: result.state === "failed" ? "failed" : "succeeded",
      startedAt: now,
      finishedAt: now,
      message: result.message,
      outcome: result.state,
    });
  } catch {
    // reporting only; the HUD or toast still shows the result
  }
  return result;
}

function codexSwitcher(cfg: Config, dir: string): Switcher {
  return async (req, hooks): Promise<SwitchOutcome> => {
    // Hand-offs normally never reach the flow (see codexHandoffFor); this covers stale launch contexts.
    if (cfg.codexSwitchMode === "codexbar") {
      try {
        await openCodexBar();
      } catch (error) {
        return { state: "failed", message: sanitize(error instanceof Error ? error.message : error) };
      }
      return { state: "handoff", message: `Pick ${req.targetLabel} in CodexBar → Codex → System Account` };
    }
    const paths = defaultCodexPaths();
    const homeProblem = codexHomeProblem(paths);
    if (homeProblem) return { state: "failed", message: homeProblem };
    const target = readSnapshot(dir).providers.codex.accounts.find((a) => a.key === req.targetKey);
    const switchTarget = target?.switchTarget;
    if (switchTarget?.kind === "codex-live") {
      // Only the live row carries this target: a repeated request for it is a no-op once the live login confirms it.
      const live = readLiveIdentity(paths);
      const expected = req.expectedEmail?.trim().toLowerCase();
      if (live?.email && expected && live.email === expected) {
        return { state: "noop", message: `Codex already uses ${sanitize(req.targetLabel, 120)}.` };
      }
      return { state: "failed", message: CODEX_NOT_SAVED };
    }
    if (!switchTarget || switchTarget.kind !== "codex-managed") return { state: "failed", message: CODEX_NOT_SAVED };
    return switchCodexDirect(req, {
      paths,
      // onSpawn: `daemon stop` can wait out a running turn (shutdownGraceSeconds); the lock must stay held.
      daemon: codexDaemonControl(expandPath(cfg.codexPath), { codexHome: paths.codexHome, onSpawn: hooks.onSpawn }),
      managedHomePath: switchTarget.homePath,
    });
  };
}

export function buildDeps(cfg: Config): FlowDeps {
  const dir = stateDir();
  const claudeCfg = {
    cswapPath: cfg.cswapPath,
    codexbarPath: cfg.codexbarPath,
    autoAddLogins: cfg.autoAddClaudeLogins,
    loginPaths: defaultClaudeLoginPaths(),
    claudePath: claudeCliPath(),
    autoAddStatePath: path.join(dir, "claude-auto-add.json"),
  };
  return {
    dir,
    fetchers: {
      claude: (hooks) => fetchClaude(claudeCfg, hooks),
      codex: () => fetchCodex({ codexbarPath: cfg.codexbarPath }),
    },
    switchers: {
      // Claude Code only; the Claude desktop app keeps its own login.
      claude: (req, hooks) => switchClaude(req, claudeCfg, hooks),
      codex: codexSwitcher(cfg, dir),
    },
  };
}

/**
 * Hand a switch to the no-view command (menu-bar onAction must do nothing but this).
 * `label` is the disambiguated display label, so messages name the right account.
 */
export async function requestSwitch(
  account: Account,
  via: SwitchRequest["via"],
  label: string = account.label,
): Promise<SwitchRequest> {
  const req: SwitchRequest = {
    requestId: randomUUID(),
    provider: account.provider,
    targetKey: account.key,
    expectedEmail: account.email,
    targetLabel: label,
    via,
  };
  await launchCommand({ name: "switch-account", type: LaunchType.Background, context: { ...req } });
  return req;
}

/** Run the optional switch hook in the background without delaying switch reporting. */
export function runAfterSwitchCommand(cfg: Config, req: SwitchRequest, result: SwitchResult): void {
  if (!cfg.afterSwitchCommand) return;
  if (result.state !== "succeeded" && result.state !== "noop" && result.state !== "unknown") return;
  try {
    const child = spawn("/bin/sh", ["-c", cfg.afterSwitchCommand], {
      detached: true,
      stdio: "ignore",
      env: {
        ...childEnv(),
        AI_ACCOUNTS_PROVIDER: req.provider,
        AI_ACCOUNTS_ACCOUNT: req.targetLabel,
        AI_ACCOUNTS_RESULT: result.state,
      },
    });
    child.on("error", () => {
      // An optional hook must not change the switch result.
    });
    child.unref();
  } catch {
    // An optional hook must not change the switch result.
  }
}

export async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "menubar", type: LaunchType.Background });
  } catch {
    // the menu-bar command is not enabled
  }
}

export async function openCodexBar(): Promise<void> {
  const result = await runQuery("/usr/bin/open", ["-a", "CodexBar"], 10_000);
  if (result.exitCode !== 0) throw new Error(sanitize(result.stderr) || "Could not open CodexBar");
}

// New tab in the front iTerm window (a new window only when none exists). The command arrives
// as an argv item, so nothing is interpolated into the script.
const ITERM_SCRIPT = `
on run argv
  set cmd to item 1 of argv
  tell application "iTerm"
    activate
    if (count of windows) is 0 then
      set w to (create window with default profile)
    else
      set w to current window
      if w is missing value then set w to first window
      tell w to create tab with default profile
    end if
    tell current session of w to write text cmd
  end tell
end run
`;

const TERMINAL_SCRIPT = `
on run argv
  set cmd to item 1 of argv
  tell application "Terminal"
    activate
    do script cmd
  end tell
end run
`;

function terminalScript(): string {
  const candidates = ["/Applications/iTerm.app", path.join(os.homedir(), "Applications/iTerm.app")];
  return candidates.some((file) => fs.existsSync(file)) ? ITERM_SCRIPT : TERMINAL_SCRIPT;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export async function openCswapDashboardInTerminal(cswapPath: string): Promise<void> {
  await runAppleScript(terminalScript(), [`${shellQuote(expandPath(cswapPath))} tui`], { timeout: 15_000 });
}

/**
 * Open a terminal that signs in to another Claude account and registers it with claude-swap. When it finishes it
 * reopens AI Accounts with a forced Claude refresh, so the new row appears even after the list was unloaded.
 */
export async function openAddClaudeAccountInTerminal(cswapPath: string): Promise<void> {
  const reopenUrl = createDeeplink({ command: "accounts", context: { action: "refresh-claude" } });
  await runAppleScript(terminalScript(), [addClaudeAccountCommand(expandPath(cswapPath), { reopenUrl })], {
    timeout: 15_000,
  });
}

/** The Claude Code CLI, used only for `claude auth status` before an auto-add. */
function claudeCliPath(): string | undefined {
  const candidates = [
    path.join(os.homedir(), ".local/bin/claude"),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
  ];
  return candidates.find((file) => {
    try {
      fs.accessSync(file, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

// "Not added" Claude app rows the user chose to hide (by row key), shared by the list and the menu bar.
const DISMISSED_FILE = "dismissed-rows.json";

export function readDismissedRows(): string[] {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(stateDir(), DISMISSED_FILE), "utf8"));
    return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function dismissRow(key: string): void {
  const next = [...new Set([...readDismissedRows(), key])].slice(-50);
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.writeFileSync(path.join(stateDir(), DISMISSED_FILE), JSON.stringify(next), { mode: 0o600 });
}

// ---------------------------------------------------------------------------
// Display helpers shared by the list and the menu bar (display freshness lives in lib/display and lib/format)

export const LEVEL_COLORS: Record<Level, Color> = {
  good: Color.Green,
  low: Color.Yellow,
  critical: Color.Red,
  unknown: Color.SecondaryText,
};

export function levelColor(value: number | null, threshold: number): Color {
  return LEVEL_COLORS[remainingLevel(value, threshold)];
}
