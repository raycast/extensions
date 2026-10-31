import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseJsonOutput, resolveExecutable, runMutation, runQuery, sanitize } from "./exec";
import { decodeJwtPayload, jwtExpiryMs } from "./jwt";
import { SwitchRequest, SwitchResult } from "./model";
import { atomicWriteFile } from "./store";

// Guarded direct Codex account switch, mirroring CodexBar 0.69's "System Account" promotion
// (CodexAccountPromotionService): preserve the displaced live login in its CodexBar managed home,
// then atomically replace <codexHome>/auth.json with the target's managed auth.json bytes.
//
// Narrower than CodexBar on purpose:
//  - both accounts must already be CodexBar-managed (no importNew of an unmanaged live account);
//  - managed-codex-accounts.json and CodexBar's config.json are never written. The displaced entry's
//    authFingerprint goes stale; CodexBar re-matches that home by email + workspace id, as its
//    reconciliation already does whenever Codex rewrites auth.json;
//  - the app-server daemon is stopped before the swap (so it cannot refresh mid-swap) and started after;
//  - refresh races are narrowed by token-age checks and byte re-reads (Codex writes auth.json in place,
//    without locks, so nothing can exclude other writers completely).
// Token values are never logged, returned or put in messages; messages carry emails and file names only.

const MIN_TOKEN_LIFETIME_MS = 10 * 60_000;
const MIN_REFRESH_AGE_MS = 60_000;
const DEFAULT_SETTLE_MS = 150;
const MAX_AUTH_BYTES = 1024 * 1024;
const STORE_FILE = "managed-codex-accounts.json";
// FileManagedCodexAccountStore.currentVersion in CodexBar 0.69; newer layouts are unknown to us.
const MAX_STORE_VERSION = 3;
const RACE_MESSAGE = "Codex rewrote its login during the switch; nothing was switched. Try again.";

// ---------------------------------------------------------------------------
// Daemon control

export interface DaemonControl {
  isRunning(): Promise<boolean>;
  stop(): Promise<void>;
  start(): Promise<void>;
}

export interface DaemonControlOptions {
  /** Codex home whose daemon this is; its app-server-daemon/ pid records decide liveness (default ~/.codex). */
  codexHome?: string;
  /** Receives the pid of each stop/start child, so the caller's provider lock is not reclaimed while it runs. */
  onSpawn?: (pid: number | undefined) => void;
  /** Whether a recorded pid is a live `codex app-server` process (tests inject this). */
  isAppServerPid?: (pid: number) => Promise<boolean>;
}

// codex-rs app-server-daemon: <codexHome>/app-server-daemon/{daemon.pid (daemon-owned install), app-server.pid
// (legacy standalone install)}, each a JSON record {"pid": n, "processStartTime": ...}. CodexBar reads both.
const DAEMON_STATE_DIR = "app-server-daemon";
const DAEMON_PID_RECORDS = ["daemon.pid", "app-server.pid"];

/** Pids the daemon's pid records name (unreadable, empty or reserved-while-starting records are skipped). */
export function recordedDaemonPids(codexHome: string): number[] {
  const pids: number[] = [];
  for (const name of DAEMON_PID_RECORDS) {
    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(path.join(codexHome, DAEMON_STATE_DIR, name), "utf8"));
    } catch {
      continue;
    }
    const pid = isRecord(data) ? data.pid : undefined;
    if (typeof pid === "number" && Number.isInteger(pid) && pid > 0 && !pids.includes(pid)) pids.push(pid);
  }
  return pids;
}

/**
 * CodexBar's CodexHomeScope.isAppServer: the pid is alive and runs `codex app-server ... --listen unix://`, so a
 * recycled pid from a stale record does not count. When ps cannot tell, the pid counts as the daemon (fail closed).
 */
async function isAppServerPid(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
  } catch (error) {
    if (errorCode(error) !== "EPERM") return false;
  }
  try {
    const result = await runQuery("/bin/ps", ["-o", "args=", "-p", String(pid)], 5_000);
    if (result.timedOut) return true;
    if (result.exitCode !== 0) return false; // ps exits 1 when the pid is gone
    const args = result.stdout.trim();
    return /(?:^|\/)codex app-server(?:\s|$)/.test(args) && args.includes("--listen") && args.includes("unix://");
  } catch {
    return true;
  }
}

/** Controls the shared `codex app-server` daemon of the default CODEX_HOME (~/.codex). */
export function codexDaemonControl(codexPath: string, opts: DaemonControlOptions = {}): DaemonControl {
  // Resolved lazily so a bad preference surfaces as a refusal from switchCodexDirect, not a throw at setup.
  const executable = (): string => resolveExecutable(codexPath);
  const codexHome = opts.codexHome ?? path.join(os.homedir(), ".codex");
  const isDaemonPid = opts.isAppServerPid ?? isAppServerPid;
  const livePid = async (): Promise<number | null> => {
    for (const pid of recordedDaemonPids(codexHome)) if (await isDaemonPid(pid)) return pid;
    return null;
  };
  const mutate = async (command: "stop" | "start"): Promise<void> => {
    const result = await runMutation(executable(), ["app-server", "daemon", command], opts.onSpawn);
    if (result.exitCode !== 0) {
      const detail =
        sanitize(result.stderr) || (result.signal !== null ? `signal ${result.signal}` : `exit ${result.exitCode}`);
      throw new Error(`codex app-server daemon ${command} failed: ${detail}`);
    }
  };
  return {
    async isRunning(): Promise<boolean> {
      const result = await runQuery(executable(), ["app-server", "daemon", "version"], 15_000);
      if (result.timedOut) throw new Error("codex app-server daemon version timed out");
      // `version` exits nonzero when nothing answers its control socket, but also when a live daemon misses the
      // 2 s probe, its settings fail to load, or the CLI has no `daemon` command. Like CodexBar, the pid
      // records decide: nonzero with no live recorded pid is "not running"; with one it is an error.
      if (result.exitCode !== 0) {
        const pid = await livePid();
        if (pid === null) return false;
        const detail =
          sanitize(result.stderr, 120) ||
          (result.signal !== null ? `signal ${result.signal}` : `exit ${result.exitCode}`);
        throw new Error(`the daemon (pid ${pid}) is running but \`codex app-server daemon version\` failed: ${detail}`);
      }
      let status: unknown;
      try {
        const parsed = parseJsonOutput(result.stdout);
        status = isRecord(parsed) ? parsed.status : undefined;
      } catch {
        throw new Error("codex app-server daemon version printed unexpected output");
      }
      if (typeof status !== "string") throw new Error("codex app-server daemon version reported no status");
      if (status === "running") return true;
      const pid = await livePid();
      if (pid !== null) {
        throw new Error(
          `the daemon (pid ${pid}) is running but \`codex app-server daemon version\` reported "${sanitize(status, 40)}"`,
        );
      }
      return false;
    },
    stop: () => mutate("stop"),
    start: () => mutate("start"),
  };
}

// ---------------------------------------------------------------------------
// Public API

/** Structurally identical to CodexPaths in codex.ts (kept separate so this module stands alone). */
export interface CodexSwitchPaths {
  codexHome: string;
  codexbarSupportDir: string;
}

/** Test-only fault-injection points. */
export interface CodexSwitchHooks {
  /** Runs after each write of the displaced home's auth.json (attempt 1, then 2 on a detected race). */
  afterDisplacedWrite?: (attempt: number) => void | Promise<void>;
  /** Runs after the live auth.json was replaced, before verification. */
  afterLiveWrite?: () => void | Promise<void>;
}

export interface CodexSwitchOptions {
  paths: CodexSwitchPaths;
  daemon: DaemonControl;
  nowMs?: () => number;
  /** The target's CodexBar managed home, resolved by the caller from the account's switchTarget. */
  managedHomePath: string;
  /** Pause before re-reading the live file to catch an in-flight writer (default 150 ms; tests pass 0). */
  settleMs?: number;
  hooks?: CodexSwitchHooks;
}

/** What a switch would do. Never contains token material. */
export interface CodexSwitchPlan {
  /** true when the target already is the live account (nothing to do). */
  noop: boolean;
  liveEmail: string;
  targetEmail: string;
  /** Managed home that receives the displaced live login. */
  displacedHomePath: string;
  targetHomePath: string;
  /** ISO expiry of the live / target access tokens (null when not known). */
  liveTokenExpiresAt: string | null;
  targetTokenExpiresAt: string | null;
}

export type CodexSwitchPreflight = { ok: true; plan: CodexSwitchPlan } | { ok: false; reason: string };

/** Read-only check used by the UI to show why a direct switch is unavailable. Never throws. */
export function preflightCodexSwitch(req: SwitchRequest, opts: CodexSwitchOptions): CodexSwitchPreflight {
  const prepared = prepareSafely(req, opts);
  return prepared.ok ? { ok: true, plan: prepared.plan } : prepared;
}

export async function switchCodexDirect(
  req: SwitchRequest,
  opts: CodexSwitchOptions,
): Promise<SwitchResult & { activeKey?: string }> {
  const label = targetLabel(req);
  const first = prepareSafely(req, opts);
  if (!first.ok) return { state: "failed", message: first.reason };
  if (!first.ctx) return { state: "noop", message: `Codex already uses ${label}.` };

  let wasRunning: boolean;
  try {
    wasRunning = await opts.daemon.isRunning();
  } catch (error) {
    return { state: "failed", message: `Could not check the Codex daemon: ${errorText(error)}. Nothing was switched.` };
  }
  if (wasRunning) {
    try {
      await opts.daemon.stop();
    } catch (error) {
      return {
        state: "failed",
        message:
          `Could not stop the Codex daemon: ${errorText(error)}. Nothing was switched.` +
          (await daemonStateAfterFailedStop(opts.daemon)),
      };
    }
  }
  const restartNote = async (): Promise<string> => {
    if (!wasRunning) return "";
    try {
      await opts.daemon.start();
      return "";
    } catch (error) {
      return ` Codex daemon did not restart: ${errorText(error)}; it starts with the next codex launch.`;
    }
  };

  // The daemon may have refreshed its login while it drained; re-validate everything from disk.
  const second = wasRunning ? prepareSafely(req, opts) : first;
  if (!second.ok) return { state: "failed", message: second.reason + (await restartNote()) };
  if (!second.ctx) return { state: "noop", message: `Codex already uses ${label}.${await restartNote()}` };

  const outcome = await swap(second.ctx, opts);
  const note = await restartNote();
  if (outcome.state === "succeeded") {
    return {
      state: "succeeded",
      message:
        `Codex → ${label}. New Codex sessions use it now; running sessions and the ChatGPT app keep the old ` +
        `account until restarted.${note}`,
      activeKey: req.targetKey,
    };
  }
  const result: SwitchResult = { state: outcome.state, message: outcome.message + note };
  if (outcome.state !== "failed" && outcome.warning) result.warning = outcome.warning;
  return result;
}

/**
 * `daemon stop` failed. Codex only fails a stop after signalling while the process is still alive, but other
 * errors can leave it down: re-probe, start it again if it is down, and say which state it ended in.
 */
async function daemonStateAfterFailedStop(daemon: DaemonControl): Promise<string> {
  let running: boolean;
  try {
    running = await daemon.isRunning();
  } catch (error) {
    return ` The daemon's state is unknown (${errorText(error)}).`;
  }
  if (running) return " The daemon is still running.";
  try {
    await daemon.start();
    return " The daemon had stopped and was started again.";
  } catch (error) {
    return ` The daemon is stopped and did not restart (${errorText(error)}); it starts with the next codex launch.`;
  }
}

// ---------------------------------------------------------------------------
// Preflight

interface AuthIdentity {
  /** Normalized (trimmed, lowercased) id_token email. */
  email: string;
  /** Normalized tokens.account_id (ChatGPT workspace / account id). */
  accountId: string;
}

interface AuthInfo extends AuthIdentity {
  accessExpMs: number | null;
  lastRefreshMs: number | null;
}

interface ManagedEntry {
  email: string;
  /** CodexBar's effectiveWorkspaceAccountID: workspaceAccountID ?? providerAccountID, normalized. */
  workspaceId: string | null;
  homePath: string;
}

interface SwapContext {
  label: string;
  expectedEmail: string;
  liveFile: string;
  liveBytes: Buffer;
  live: AuthInfo;
  displacedFile: string;
  targetFile: string;
  targetBytes: Buffer;
  target: AuthInfo;
  targetEntry: ManagedEntry;
}

type Prepared = { ok: true; plan: CodexSwitchPlan; ctx: SwapContext | null } | { ok: false; reason: string };

function prepareSafely(req: SwitchRequest, opts: CodexSwitchOptions): Prepared {
  try {
    return prepare(req, opts);
  } catch (error) {
    return { ok: false, reason: `Could not check the Codex switch: ${errorText(error)}` };
  }
}

function prepare(req: SwitchRequest, opts: CodexSwitchOptions): Prepared {
  const now = (opts.nowMs ?? Date.now)();
  const label = targetLabel(req);
  if (req.provider !== "codex") return { ok: false, reason: "Not a Codex switch request." };

  const codexHome = path.resolve(opts.paths.codexHome);

  // a. Credential store must be the auth.json file.
  const storeProblem = credentialStoreProblem(codexHome);
  if (storeProblem) return { ok: false, reason: storeProblem };

  // b. Live login.
  const liveFile = path.join(codexHome, "auth.json");
  const liveRead = readRegular(liveFile);
  if (liveRead.kind !== "ok") return { ok: false, reason: readProblem(liveRead, "Codex's auth.json") };
  const liveParsed = parseAuth(liveRead.bytes, "Codex's auth.json");
  if (!liveParsed.ok) return liveParsed;
  const live = liveParsed.info;

  // c. The live login must be exactly one CodexBar-managed entry (its preservation home).
  const store = readManagedStore(opts.paths.codexbarSupportDir);
  if (!store.ok) return store;
  const liveMatches = store.entries.filter((e) => e.email === live.email && e.workspaceId === live.accountId);
  if (liveMatches.length === 0) {
    return {
      ok: false,
      reason:
        `Your current Codex account (${live.email}) is not saved in CodexBar yet. Switch once from CodexBar's ` +
        "menu (System Account) so it is preserved, then one-key switching works.",
    };
  }
  if (liveMatches.length > 1) {
    return {
      ok: false,
      reason: `CodexBar has ${liveMatches.length} saved entries for ${live.email}; open CodexBar to resolve the duplicate.`,
    };
  }
  const displaced = liveMatches[0];

  // d. Target entry and its saved login.
  const expectedEmail = normalizeEmail(req.expectedEmail);
  if (!expectedEmail)
    return { ok: false, reason: `The switch request for ${label} has no email to verify; refresh and try again.` };
  const targetHome = path.resolve(opts.managedHomePath);
  const targetEntries = store.entries.filter((e) => e.homePath === targetHome);
  if (targetEntries.length !== 1) {
    return {
      ok: false,
      reason:
        targetEntries.length === 0
          ? `${label} is not in CodexBar's saved accounts any more; refresh and try again.`
          : `CodexBar lists ${label}'s home more than once; open CodexBar to repair it.`,
    };
  }
  const targetEntry = targetEntries[0];
  if (targetEntry.homePath === codexHome || displaced.homePath === codexHome) {
    return { ok: false, reason: "A CodexBar saved account points at Codex's own home; open CodexBar to repair it." };
  }
  if (targetEntry.email !== expectedEmail) {
    return {
      ok: false,
      reason: `CodexBar's saved account there is ${targetEntry.email}, not ${expectedEmail}; refresh and try again.`,
    };
  }
  const liveExpiresAt = isoOrNull(live.accessExpMs);
  if (targetEntry === displaced) {
    return {
      ok: true,
      ctx: null,
      plan: {
        noop: true,
        liveEmail: live.email,
        targetEmail: targetEntry.email,
        displacedHomePath: displaced.homePath,
        targetHomePath: targetEntry.homePath,
        liveTokenExpiresAt: liveExpiresAt,
        targetTokenExpiresAt: liveExpiresAt,
      },
    };
  }
  if (targetEntry.workspaceId === null) {
    return { ok: false, reason: `CodexBar has no workspace id for ${label}; switch from CodexBar's menu instead.` };
  }
  const homesProblem = managedHomesProblem(codexHome, opts.paths.codexbarSupportDir, [
    { home: displaced.homePath, who: live.email },
    { home: targetEntry.homePath, who: label },
  ]);
  if (homesProblem) return { ok: false, reason: homesProblem };
  const targetFile = path.join(targetEntry.homePath, "auth.json");
  const targetRead = readRegular(targetFile);
  if (targetRead.kind !== "ok") return { ok: false, reason: readProblem(targetRead, `${label}'s saved auth.json`) };
  const targetChecked = checkTarget(targetRead.bytes, label, expectedEmail, targetEntry);
  if (!targetChecked.ok) return targetChecked;
  const target = targetChecked.info;
  if (sameIdentity(target, live)) {
    // Unreachable while store entries are unique by email + workspace; kept as a guard.
    return {
      ok: false,
      reason: `${label}'s saved login is the current Codex login but CodexBar lists it twice; open CodexBar.`,
    };
  }

  // Mirror CodexBar's conflictingReadableManagedHome rule: a displaced home CodexBar can read a login from must
  // hold the live account. A missing or unreadable one is repaired by the save, as CodexBar's repairExisting does.
  // (The home itself was checked by managedHomesProblem.)
  const displacedFile = path.join(displaced.homePath, "auth.json");
  const displacedRead = readRegular(displacedFile);
  if (displacedRead.kind === "symlink" || displacedRead.kind === "notFile" || displacedRead.kind === "tooLarge") {
    return { ok: false, reason: readProblem(displacedRead, `CodexBar's saved auth.json for ${live.email}`) };
  }
  if (displacedRead.kind === "ok") {
    const other = displacedConflict(displacedRead.bytes, live);
    if (other) {
      return {
        ok: false,
        reason: `CodexBar's saved home for ${live.email} holds ${other} instead; open CodexBar to repair it.`,
      };
    }
  } else if (displacedRead.kind === "error") {
    return { ok: false, reason: readProblem(displacedRead, `CodexBar's saved auth.json for ${live.email}`) };
  }

  // e. Refresh-race guards.
  const liveGuard = liveFreshnessProblem(live, now);
  if (liveGuard) return { ok: false, reason: liveGuard };
  const targetGuard = targetFreshnessProblem(target, label, now);
  if (targetGuard) return { ok: false, reason: targetGuard };

  return {
    ok: true,
    plan: {
      noop: false,
      liveEmail: live.email,
      targetEmail: target.email,
      displacedHomePath: displaced.homePath,
      targetHomePath: targetEntry.homePath,
      liveTokenExpiresAt: liveExpiresAt,
      targetTokenExpiresAt: isoOrNull(target.accessExpMs),
    },
    ctx: {
      label,
      expectedEmail,
      liveFile,
      liveBytes: liveRead.bytes,
      live,
      displacedFile,
      targetFile,
      targetBytes: targetRead.bytes,
      target,
      targetEntry,
    },
  };
}

function checkTarget(
  bytes: Buffer,
  label: string,
  expectedEmail: string,
  entry: ManagedEntry,
): { ok: true; info: AuthInfo } | { ok: false; reason: string } {
  const parsed = parseAuth(bytes, `${label}'s saved auth.json`);
  if (!parsed.ok) return parsed;
  const info = parsed.info;
  if (info.email !== expectedEmail || info.email !== entry.email) {
    return {
      ok: false,
      reason: `${label}'s saved login is for ${info.email}, not ${expectedEmail}; refresh and try again.`,
    };
  }
  // CodexBar refuses targets whose auth default workspace differs from the selected one
  // (targetManagedAccountWorkspaceDiffersFromAuthDefault).
  if (info.accountId !== entry.workspaceId) {
    return {
      ok: false,
      reason: `${label}'s saved login is for a different workspace than CodexBar selected; switch from CodexBar's menu instead.`,
    };
  }
  return { ok: true, info };
}

/**
 * What the displaced home's auth.json holds when it conflicts with the live login, else null.
 *
 * CodexBar reads a login from any JSON object with a non-empty OPENAI_API_KEY or with tokens.access_token and
 * tokens.refresh_token; anything else is unreadable and repairable. A readable login must be the live account
 * (CodexIdentityMatcher): its account id (tokens.account_id, else the id_token's chatgpt_account_id claim) must
 * equal the live one, and its email must too when the id_token has one. So an API-key login, another auth mode,
 * or a login without an account id is never overwritten.
 */
function displacedConflict(bytes: Buffer, live: AuthIdentity): string | null {
  let json: unknown;
  try {
    json = JSON.parse(bytes.toString("utf8"));
  } catch {
    return null;
  }
  if (!isRecord(json)) return null;
  const hasApiKey = nonEmpty(json.OPENAI_API_KEY);
  const tokens = isRecord(json.tokens) ? json.tokens : null;
  const hasTokens = tokens !== null && nonEmpty(tokens.access_token) && nonEmpty(tokens.refresh_token);
  if (!hasApiKey && !hasTokens) return null;
  if (!tokens || !hasTokens) return "an API-key login";
  const mode = json.auth_mode;
  if (mode !== undefined && mode !== null && mode !== "chatgpt") {
    return `a non-ChatGPT login (auth mode ${sanitize(mode, 40)})`;
  }
  const payload = decodeJwtPayload(tokens.id_token);
  const authClaims = payload?.["https://api.openai.com/auth"];
  const profile = payload?.["https://api.openai.com/profile"];
  const email = normalizeEmail(payload?.email) ?? normalizeEmail(isRecord(profile) ? profile.email : undefined);
  const accountId =
    normalizeId(tokens.account_id) ??
    normalizeId(isRecord(authClaims) ? authClaims.chatgpt_account_id : undefined) ??
    normalizeId(payload?.chatgpt_account_id);
  if (email !== null && email !== live.email) return email;
  if (accountId === null) return `a login without a workspace id${email ? ` (${email})` : ""}`;
  if (accountId !== live.accountId) return `a login for another workspace${email ? ` (${email})` : ""}`;
  return null;
}

/**
 * The managed homes a switch writes must be real directories strictly inside CodexBar's managed-codex-homes
 * folder (CodexBar's validateManagedHomeForDeletion, plus symlink resolution), and must be different
 * directories from each other and from Codex's own home. Compared by (dev, ino), not by path string: a case or
 * symlink alias of ~/.codex would otherwise receive the "preserve" write and the live login would be lost.
 */
function managedHomesProblem(
  codexHome: string,
  supportDir: string,
  homes: { home: string; who: string }[],
): string | null {
  const root = path.resolve(supportDir, "managed-codex-homes");
  const inside = (base: string, p: string): boolean => p.startsWith(base.endsWith(path.sep) ? base : base + path.sep);
  let realRoot: string;
  try {
    realRoot = fs.realpathSync(root);
  } catch (error) {
    return `CodexBar's managed-codex-homes folder could not be read (${errorCode(error)}); open CodexBar to repair it.`;
  }
  const seen: { who: string; dev: number; ino: number }[] = [];
  for (const { home, who } of homes) {
    const repair = (what: string) => `CodexBar's saved home for ${who} ${what}; open CodexBar to repair it.`;
    if (!inside(root, path.resolve(home))) return repair("is outside its managed-codex-homes folder");
    let stat: fs.Stats;
    let real: string;
    try {
      stat = fs.lstatSync(home);
      if (stat.isSymbolicLink()) return repair("is a symlink");
      if (!stat.isDirectory()) return repair("is not a folder");
      real = fs.realpathSync(home);
    } catch (error) {
      return errorCode(error) === "ENOENT" ? repair("is missing") : repair(`could not be read (${errorCode(error)})`);
    }
    if (!inside(realRoot, real)) return repair("resolves outside its managed-codex-homes folder");
    const twin = seen.find((s) => s.dev === stat.dev && s.ino === stat.ino);
    if (twin)
      return `CodexBar's saved homes for ${twin.who} and ${who} are the same folder; open CodexBar to repair it.`;
    seen.push({ who, dev: stat.dev, ino: stat.ino });
  }
  let own: fs.Stats;
  try {
    own = fs.statSync(codexHome);
  } catch (error) {
    return `Could not read Codex's home folder (${errorCode(error)}).`;
  }
  const alias = seen.find((s) => s.dev === own.dev && s.ino === own.ino);
  if (alias) return `CodexBar's saved home for ${alias.who} is Codex's own home; open CodexBar to repair it.`;
  return null;
}

function liveFreshnessProblem(live: AuthInfo, now: number): string | null {
  if (live.accessExpMs === null) {
    return "Could not read when your current Codex login token expires; try again after Codex refreshes it.";
  }
  const left = live.accessExpMs - now;
  if (left <= 0) return "Your current Codex login token has expired; open Codex once so it refreshes, then try again.";
  if (left <= MIN_TOKEN_LIFETIME_MS) {
    return `Codex is refreshing its login right now (token expires in ${Math.floor(left / 60_000)} min); try again in a minute.`;
  }
  if (live.lastRefreshMs === null) return "Could not read when Codex last refreshed its login; try again in a minute.";
  const age = now - live.lastRefreshMs;
  if (age < MIN_REFRESH_AGE_MS) {
    return `Codex refreshed its login ${Math.max(0, Math.floor(age / 1000))} s ago; try again in a minute.`;
  }
  return null;
}

function targetFreshnessProblem(target: AuthInfo, label: string, now: number): string | null {
  if (target.accessExpMs === null)
    return `Could not read when ${label}'s saved login token expires; switch from CodexBar's menu instead.`;
  const left = target.accessExpMs - now;
  if (left <= 0) {
    return `${label}'s saved login token has expired; open CodexBar's menu so it refreshes that account, then try again.`;
  }
  if (left <= MIN_TOKEN_LIFETIME_MS) {
    return `${label} login token expires in ${Math.floor(left / 60_000)} min; open Codex with that account once or wait, then try again.`;
  }
  return null;
}

function credentialStoreProblem(codexHome: string): string | null {
  let text: string;
  try {
    text = fs.readFileSync(path.join(codexHome, "config.toml"), "utf8");
  } catch (error) {
    if (errorCode(error) === "ENOENT") return null; // default store is the file
    return `Could not read Codex's config.toml (${errorCode(error)}).`;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!/^(?:[\w-]+\.)*cli_auth_credentials_store\s*=/.test(line)) continue;
    const match = /=\s*(?:"([^"]*)"|'([^']*)')\s*(?:#.*)?$/.exec(line);
    const value = match ? (match[1] ?? match[2]) : null;
    if (value !== "file") {
      const where = value ? `"${sanitize(value, 20)}"` : "a non-file";
      return (
        `Codex keeps its login in ${where} credential store (cli_auth_credentials_store in config.toml), not in ` +
        "auth.json; direct switching needs the file store. Switch from CodexBar's menu instead."
      );
    }
  }
  return null;
}

function readManagedStore(supportDir: string): { ok: true; entries: ManagedEntry[] } | { ok: false; reason: string } {
  let text: string;
  try {
    text = fs.readFileSync(path.join(supportDir, STORE_FILE), "utf8");
  } catch (error) {
    if (errorCode(error) === "ENOENT") return { ok: true, entries: [] };
    return { ok: false, reason: `Could not read CodexBar's ${STORE_FILE} (${errorCode(error)}).` };
  }
  const malformed = {
    ok: false as const,
    reason: `CodexBar's ${STORE_FILE} has an unexpected format; open CodexBar once and try again.`,
  };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return malformed;
  }
  if (!isRecord(data) || !Array.isArray(data.accounts)) return malformed;
  const version = data.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1 || version > MAX_STORE_VERSION) {
    return {
      ok: false,
      reason: `CodexBar's ${STORE_FILE} version ${sanitize(version, 12)} is not supported; switch from CodexBar's menu.`,
    };
  }
  const entries: ManagedEntry[] = [];
  for (const raw of data.accounts) {
    if (!isRecord(raw)) return malformed;
    const email = normalizeEmail(raw.email);
    const home = typeof raw.managedHomePath === "string" ? raw.managedHomePath : "";
    if (!email || !path.isAbsolute(home)) return malformed;
    entries.push({
      email,
      workspaceId: normalizeId(raw.workspaceAccountID) ?? normalizeId(raw.providerAccountID),
      homePath: path.resolve(home),
    });
  }
  return { ok: true, entries };
}

// ---------------------------------------------------------------------------
// Swap (steps 2-7; daemon handling is in switchCodexDirect)

type SwapOutcome =
  | { state: "succeeded" }
  | { state: "failed"; message: string }
  | { state: "unknown"; message: string; warning?: string };

async function swap(ctx: SwapContext, opts: CodexSwitchOptions): Promise<SwapOutcome> {
  const hooks = opts.hooks ?? {};
  const settleMs = opts.settleMs ?? DEFAULT_SETTLE_MS;
  const now = (opts.nowMs ?? Date.now)();
  let liveWriteAttempted = false;
  try {
    // 3-4. Preserve the live login in the displaced home, then confirm no writer raced us.
    let preserved = ctx.liveBytes;
    try {
      atomicWriteFile(ctx.displacedFile, preserved, 0o600);
    } catch (error) {
      return {
        state: "failed",
        message: `Could not save ${ctx.live.email} into CodexBar's saved home (${errorCode(error)}); nothing was switched.`,
      };
    }
    let stable = false;
    for (let attempt = 1; attempt <= 2; attempt++) {
      await hooks.afterDisplacedWrite?.(attempt);
      await pause(settleMs);
      const again = readRegular(ctx.liveFile);
      if (again.kind === "ok" && again.bytes.equals(preserved)) {
        stable = true;
        break;
      }
      if (attempt === 2 || again.kind !== "ok") break;
      // Keep the newer bytes only when they are a complete login of the same account (Codex writes in
      // place, so a torn read must never overwrite the saved copy).
      const newer = parseAuth(again.bytes, "Codex's auth.json");
      if (!newer.ok || !sameIdentity(newer.info, ctx.live)) break;
      try {
        atomicWriteFile(ctx.displacedFile, again.bytes, 0o600);
      } catch (error) {
        return {
          state: "failed",
          message: `Could not save ${ctx.live.email} into CodexBar's saved home (${errorCode(error)}); nothing was switched.`,
        };
      }
      preserved = again.bytes;
    }
    if (!stable) return { state: "failed", message: RACE_MESSAGE };

    // 5. The target's saved copy may have been refreshed (CodexBar runs Codex in managed homes).
    let targetBytes = ctx.targetBytes;
    const targetAgain = readRegular(ctx.targetFile);
    const targetChanged = `${ctx.label}'s saved login changed during the switch; nothing was switched. Try again.`;
    if (targetAgain.kind !== "ok") return { state: "failed", message: targetChanged };
    if (!targetAgain.bytes.equals(targetBytes)) {
      const checked = checkTarget(targetAgain.bytes, ctx.label, ctx.expectedEmail, ctx.targetEntry);
      if (!checked.ok || !sameIdentity(checked.info, ctx.target)) return { state: "failed", message: targetChanged };
      const problem = targetFreshnessProblem(checked.info, ctx.label, now);
      if (problem) return { state: "failed", message: problem };
      targetBytes = targetAgain.bytes;
    }

    // Last look right before the swap: the live file must still be what we preserved.
    const lastLook = readRegular(ctx.liveFile);
    if (lastLook.kind !== "ok" || !lastLook.bytes.equals(preserved)) return { state: "failed", message: RACE_MESSAGE };

    // 6. Atomic replace (rename), so a failure leaves the live file as it was.
    liveWriteAttempted = true;
    try {
      atomicWriteFile(ctx.liveFile, targetBytes, 0o600);
    } catch (error) {
      return {
        state: "failed",
        message: `Could not write Codex's auth.json (${errorCode(error)}); nothing was switched.`,
      };
    }
    await hooks.afterLiveWrite?.();

    // 7. Verify. No automatic rollback: report exactly what is where.
    const liveNow = readRegular(ctx.liveFile);
    const liveNowParsed = liveNow.kind === "ok" ? parseAuth(liveNow.bytes, "Codex's auth.json") : null;
    const liveOk = liveNowParsed?.ok === true && sameIdentity(liveNowParsed.info, ctx.target);
    const savedNow = readRegular(ctx.displacedFile);
    const savedOk = savedNow.kind === "ok" && savedNow.bytes.equals(preserved);
    if (liveOk && savedOk) return { state: "succeeded" };
    const liveDesc = liveOk
      ? `holds ${ctx.target.email} as expected`
      : liveNowParsed?.ok === true
        ? `holds ${liveNowParsed.info.email}, not ${ctx.target.email}`
        : "is unreadable";
    const savedDesc = savedOk ? "is intact" : "changed after it was saved";
    const outcome: Extract<SwapOutcome, { state: "unknown" }> = {
      state: "unknown",
      message:
        `Codex switch to ${ctx.label} could not be verified: Codex's auth.json ${liveDesc}, and CodexBar's ` +
        `saved copy of ${ctx.live.email} ${savedDesc}. Nothing was rolled back; check CodexBar's System Account ` +
        "menu before switching again.",
    };
    // A refresh can later confirm the live side, never the saved copy: the flow must not upgrade this away.
    if (!savedOk) {
      outcome.warning =
        `CodexBar's saved copy of ${ctx.live.email} changed after it was saved; check CodexBar's System Account ` +
        "menu before switching back.";
    }
    return outcome;
  } catch (error) {
    return liveWriteAttempted
      ? {
          state: "unknown",
          message: `Codex switch to ${ctx.label} was interrupted after Codex's auth.json was replaced (${errorText(error)}); check CodexBar's System Account menu.`,
        }
      : { state: "failed", message: `Codex switch failed before anything was switched: ${errorText(error)}` };
  }
}

// ---------------------------------------------------------------------------
// Helpers

type ReadOutcome =
  | { kind: "ok"; bytes: Buffer }
  | { kind: "missing" }
  | { kind: "symlink" }
  | { kind: "notFile" }
  | { kind: "tooLarge" }
  | { kind: "error"; code: string };

/** Read a regular file without following a symlink at the final component (O_NOFOLLOW + fstat). */
function readRegular(file: string): ReadOutcome {
  let fd: number;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  } catch (error) {
    const code = errorCode(error);
    if (code === "ENOENT") return { kind: "missing" };
    if (code === "ELOOP") return { kind: "symlink" };
    return { kind: "error", code };
  }
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) return { kind: "notFile" };
    if (stat.size > MAX_AUTH_BYTES) return { kind: "tooLarge" };
    return { kind: "ok", bytes: fs.readFileSync(fd) };
  } catch (error) {
    return { kind: "error", code: errorCode(error) };
  } finally {
    fs.closeSync(fd);
  }
}

function readProblem(outcome: Exclude<ReadOutcome, { kind: "ok" }>, what: string): string {
  switch (outcome.kind) {
    case "missing":
      return `${what} does not exist; log in to Codex first.`;
    case "symlink":
      return `${what} is a symlink; direct switching only replaces regular files. Switch from CodexBar's menu instead.`;
    case "notFile":
      return `${what} is not a regular file.`;
    case "tooLarge":
      return `${what} is unexpectedly large.`;
    case "error":
      return `Could not read ${what} (${outcome.code}).`;
  }
}

function parseAuth(bytes: Buffer, what: string): { ok: true; info: AuthInfo } | { ok: false; reason: string } {
  let json: unknown;
  try {
    json = JSON.parse(bytes.toString("utf8"));
  } catch {
    return { ok: false, reason: `${what} is not valid JSON (Codex may be writing it); try again in a moment.` };
  }
  if (!isRecord(json)) return { ok: false, reason: `${what} has an unexpected format.` };
  const mode = json.auth_mode;
  if (mode !== undefined && mode !== null && mode !== "chatgpt") {
    return { ok: false, reason: `${what} is not a ChatGPT login (auth mode ${sanitize(mode, 40)}).` };
  }
  const tokens = json.tokens;
  if (!isRecord(tokens)) return { ok: false, reason: `${what} has no ChatGPT login tokens.` };
  for (const key of ["id_token", "access_token", "refresh_token", "account_id"]) {
    if (typeof tokens[key] !== "string" || !(tokens[key] as string).trim()) {
      return { ok: false, reason: `${what} is missing tokens.${key}.` };
    }
  }
  // Same claims Codex and CodexBar read: email, falling back to the profile claim.
  const payload = decodeJwtPayload(tokens.id_token);
  const profile = payload?.["https://api.openai.com/profile"];
  const email = normalizeEmail(payload?.email) ?? normalizeEmail(isRecord(profile) ? profile.email : undefined);
  if (!email) return { ok: false, reason: `${what} has no email in its id_token.` };
  const accountId = normalizeId(tokens.account_id);
  if (!accountId) return { ok: false, reason: `${what} is missing tokens.account_id.` };
  const lastRefresh = typeof json.last_refresh === "string" ? Date.parse(json.last_refresh) : Number.NaN;
  return {
    ok: true,
    info: {
      email,
      accountId,
      accessExpMs: jwtExpiryMs(tokens.access_token),
      lastRefreshMs: Number.isFinite(lastRefresh) ? lastRefresh : null,
    },
  };
}

function sameIdentity(a: AuthIdentity, b: AuthIdentity): boolean {
  return a.email === b.email && a.accountId === b.accountId;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

/** CodexBar's normalizeWorkspaceAccountID: trimmed, lowercased, empty -> null. */
function normalizeId(value: unknown): string | null {
  return normalizeEmail(value);
}

function nonEmpty(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function targetLabel(req: SwitchRequest): string {
  return sanitize(req.targetLabel, 80) || sanitize(req.expectedEmail, 80) || "the selected account";
}

function isoOrNull(ms: number | null): string | null {
  return ms === null ? null : new Date(ms).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorCode(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return typeof code === "string" ? code : "error";
}

function errorText(error: unknown): string {
  return sanitize(error instanceof Error ? error.message : error) || "unknown error";
}

function pause(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}
