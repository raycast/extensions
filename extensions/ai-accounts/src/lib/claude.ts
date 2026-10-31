import fs from "node:fs";
import { Account, AccountStatus, Pace, ProviderFetch, SwitchRequest, SwitchResult, UsageWindow } from "./model";
import {
  DeadlineError,
  ExecError,
  parseJsonOutput,
  resolveExecutable,
  RunResult,
  runMutation,
  runQuery,
  runQueryNoKill,
  sanitize,
} from "./exec";
import {
  AutoAddState,
  ClaudeLoginPaths,
  readAutoAddState,
  readClaudeAppAccountUuid,
  readCswapAccountUuids,
  writeAutoAddState,
} from "./claudeLogins";

// Claude provider: claude-swap (cswap) is the multi-account backend. When cswap is not
// installed, CodexBar's CLI reports the ambient Claude login only (no switching).
// JSON shapes follow claude-swap 0.26.0 json_output.py / switcher.py (schemaVersion 1).

export interface ClaudeConfig {
  cswapPath: string;
  codexbarPath: string;
  /** UI deadline for one cswap --list/--status run (default 30 s). Tests shorten it. */
  queryDeadlineMs?: number;
  /** Register an untracked Claude Code login with `cswap add` during a refresh (off unless set). */
  autoAddLogins?: boolean;
  /** Where to look for logins claude-swap does not track (Claude desktop app). Omitted: no discovery. */
  loginPaths?: ClaudeLoginPaths;
  /** Claude Code CLI, used to confirm a login is a Claude subscription login before auto-adding it. */
  claudePath?: string;
  /** JSON file remembering tracked emails and failed auto-adds. Omitted: no memory (tests). */
  autoAddStatePath?: string;
}

const LIST_ARGS = ["--list", "--json"] as const;
const ADD_ARGS = ["add"] as const;
const STATUS_ARGS = ["--status", "--json"] as const;
/**
 * UI deadline for cswap --list/--status. Both can rotate OAuth refresh tokens and write the keychain, so the
 * child is never signalled: at the deadline the extension stops waiting and the child finishes detached.
 */
const CSWAP_DEADLINE_MS = 30_000;
/** The live-login lookup when no slot is active; an unmanaged --status answer is local and fast. */
const CSWAP_LOOKUP_DEADLINE_MS = 10_000;
/**
 * cswap polls idle candidates and exhausted accounts about every 600 s (+/-10% jitter) and still reports those
 * readings as decision-grade (usageStatus "ok" with usage). 12 min covers 660 s plus slack.
 */
const CSWAP_DECISION_MAX_AGE_MINUTES = 12;
const CSWAP_BUSY = "claude-swap is still refreshing; showing previous readings";
export const CODEXBAR_TIMEOUT_MS = 45_000;
const AMBIENT_NOTICE = "claude-swap not installed — showing the current Claude login only";
const BROWSER_SESSION_NOTICE =
  "CodexBar read a login other than Claude Code's (e.g. the claude.ai browser session); it is not shown as active";
/** CodexBar sources that read the Claude Code login itself (OAuth credentials or the Claude CLI PTY). */
const CLAUDE_CODE_SOURCES: ReadonlySet<string> = new Set(["oauth", "claude", "cli"]);

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Percent used; exact 0 and 100 are kept, over-quota values cap at 100, anything else is unknown. */
function pct(value: unknown): number | null {
  const n = finite(value);
  if (n === null || n < 0) return null;
  return Math.min(100, n);
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i;

/** Absolute ISO instant (explicit offset required), normalized; otherwise null. */
function iso(value: unknown): string | null {
  if (typeof value !== "string" || !ISO_INSTANT.test(value.trim())) return null;
  const ms = Date.parse(value.trim());
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** Remove anything that looks like a token before backend text is cached or displayed. */
function redact(value: unknown): string {
  return String(value ?? "")
    .replace(/eyJ[\w-]+\.[\w-]+(?:\.[\w-]+)?/g, "[redacted]")
    .replace(/\bsk-[\w-]{8,}/g, "[redacted]")
    .replace(/[A-Za-z0-9_+=-]{40,}/g, "[redacted]");
}

function clean(value: unknown, max = 240): string {
  return sanitize(redact(value), max);
}

function errorText(error: unknown): string {
  return clean(error instanceof Error ? error.message : error);
}

function stderrHint(stderr: string): string {
  const lines = stderr
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim());
  const last = lines.length > 0 ? clean(lines[lines.length - 1], 160) : "";
  return last ? `: ${last}` : "";
}

export function claudeKey(email: string | null, organizationUuid: string | null): string {
  const e = (email ?? "").trim().toLowerCase();
  const o = (organizationUuid ?? "").trim().toLowerCase();
  return `claude:${e || "ambient"}|${o}`;
}

/** Organization part of a claudeKey (without a duplicate-slot "#n" suffix). */
function orgFromKey(key: string): string {
  const org = key.slice(key.lastIndexOf("|") + 1);
  const hash = org.indexOf("#");
  return hash >= 0 ? org.slice(0, hash) : org;
}

function baseKey(key: string): string {
  const bar = key.lastIndexOf("|");
  const hash = key.indexOf("#", bar);
  return hash >= 0 ? key.slice(0, hash) : key;
}

function sameEmail(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Session + weekly both apply to every subscription login; used when their values are unknown. */
function unknownCoreWindows(): UsageWindow[] {
  return [
    {
      id: "session",
      kind: "session",
      label: "5h",
      usedPct: null,
      resetsAt: null,
      observedAt: null,
      windowMinutes: 300,
    },
    {
      id: "weekly",
      kind: "weekly",
      label: "Weekly",
      usedPct: null,
      resetsAt: null,
      observedAt: null,
      windowMinutes: 10080,
    },
  ];
}

/**
 * A successful reading that omits the 5h or weekly window means that window is not binding
 * (e.g. no live 5h session), matching cswap's own headroom rule. A reading with neither is unknown.
 */
function withCoreWindows(windows: UsageWindow[]): UsageWindow[] {
  if (windows.some((w) => w.kind === "session" || w.kind === "weekly")) return windows;
  return [...unknownCoreWindows(), ...windows];
}

function uniqueId(base: string, seen: Set<string>): string {
  let id = base;
  for (let n = 2; seen.has(id); n++) id = `${base}#${n}`;
  seen.add(id);
  return id;
}

// ---------------------------------------------------------------------------
// claude-swap

function cswapPace(entry: Json): Pace | undefined {
  const pace: Pace = {};
  const expected = finite(entry.expectedPct);
  if (expected !== null) pace.expectedUsedPct = expected;
  if (typeof entry.willLastToReset === "boolean") pace.willLastToReset = entry.willLastToReset;
  const eta = iso(entry.projectedExhaustionAt);
  if (eta) pace.projectedExhaustionAt = eta;
  return Object.keys(pace).length > 0 ? pace : undefined;
}

function cswapWindows(usage: Json, observedAt: string | null): UsageWindow[] {
  const out: UsageWindow[] = [];
  const five = usage.fiveHour;
  if (isObject(five)) {
    out.push({
      id: "session",
      kind: "session",
      label: "5h",
      usedPct: pct(five.pct),
      resetsAt: iso(five.resetsAt),
      observedAt,
      windowMinutes: 300,
    });
  }
  const seven = usage.sevenDay;
  if (isObject(seven)) {
    const w: UsageWindow = {
      id: "weekly",
      kind: "weekly",
      label: "Weekly",
      usedPct: pct(seven.pct),
      resetsAt: iso(seven.resetsAt),
      observedAt,
      windowMinutes: 10080,
    };
    const pace = cswapPace(seven);
    if (pace) w.pace = pace;
    out.push(w);
  }
  if (Array.isArray(usage.scoped)) {
    const seen = new Set<string>();
    for (const entry of usage.scoped) {
      if (!isObject(entry)) continue;
      const name = clean(entry.name, 60);
      if (!name) continue;
      const w: UsageWindow = {
        id: uniqueId(`scoped:${name}`, seen),
        kind: "scoped",
        label: name,
        usedPct: pct(entry.pct),
        resetsAt: iso(entry.resetsAt),
        observedAt,
        windowMinutes: 10080,
      };
      const pace = cswapPace(entry);
      if (pace) w.pace = pace;
      out.push(w);
    }
  }
  return withCoreWindows(out);
}

function observedAtOf(fetchedAt: unknown, ageSeconds: unknown, nowMs?: number): string | null {
  const at = iso(fetchedAt);
  if (at) return at;
  const age = finite(ageSeconds);
  if (age !== null && age >= 0 && typeof nowMs === "number" && Number.isFinite(nowMs)) {
    return new Date(nowMs - age * 1000).toISOString();
  }
  return null;
}

function cswapErrorMessage(error: Json): string {
  const type = clean(error.type, 60);
  const message = clean(error.message) || "unknown error";
  return clean(`claude-swap${type ? ` ${type}` : ""}: ${message}`);
}

/** Validate a cswap schema-v1 payload; throws Error(sanitized) on an error envelope or other schema. */
function checkCswapPayload(data: unknown): Json {
  if (!isObject(data)) throw new Error("claude-swap returned unexpected JSON");
  if (isObject(data.error)) throw new Error(cswapErrorMessage(data.error));
  if (data.schemaVersion !== 1) {
    throw new Error(`Unsupported claude-swap JSON schemaVersion ${clean(data.schemaVersion, 20) || "(missing)"}`);
  }
  return data;
}

function statusFromCswap(
  row: Json,
  usage: Json | null,
  email: string | null,
  slot: number | null,
): { status: AccountStatus; detail?: string } {
  const who = email ?? "this account";
  const slotArg = slot ?? "N";
  const usageStatus = str(row.usageStatus) ?? "unavailable";
  switch (usageStatus) {
    case "ok":
      return usage ? { status: "ok" } : { status: "unavailable", detail: "claude-swap returned no usage data" };
    case "relogin_required":
      return {
        status: "relogin",
        detail: `Re-login needed: run /login as ${who} in Claude Code, then cswap add --slot ${slotArg}`,
      };
    case "token_expired":
      return usage
        ? { status: "ok" }
        : { status: "unavailable", detail: "Token expired; refreshes on next Claude message" };
    case "keychain_unavailable":
      return { status: "unavailable", detail: "Keychain locked or unavailable; retry" };
    case "api_key":
      return { status: "unavailable", detail: "API-key login has no subscription quota" };
    case "foreign_credential":
      return {
        status: "error",
        detail: `The live Claude login belongs to another account; switch away and back, or run cswap --switch-to ${slotArg}, to repair it`,
      };
    case "no_credentials":
      return {
        status: "relogin",
        detail: `No stored login: run /login as ${who} in Claude Code, then cswap add --slot ${slotArg}`,
      };
    case "unavailable": {
      const reason = clean(row.usageError, 60);
      return { status: "unavailable", detail: reason ? `Usage unavailable (${reason})` : "Usage unavailable" };
    }
    default:
      return { status: "unavailable", detail: `Unknown claude-swap usage status: ${clean(usageStatus, 40)}` };
  }
}

/** cswap usage states whose slot must not be activated by a one-key switch. */
const SWITCH_REFUSED: ReadonlySet<string> = new Set(["relogin_required", "no_credentials"]);

function accountFromCswapRow(row: Json, nowMs?: number): Account {
  const slot = typeof row.number === "number" && Number.isInteger(row.number) && row.number > 0 ? row.number : null;
  const emailRaw = str(row.email);
  const email = emailRaw ? clean(emailRaw, 254) : null;
  const orgUuid = str(row.organizationUuid);
  const alias = str(row.alias) ? clean(row.alias, 80) : null;
  const orgName = str(row.organizationName);
  const defaultOrg = !!orgName && !!email && orgName.toLowerCase() === `${email.toLowerCase()}'s organization`;
  const planRaw = str(row.plan) ?? str(row.subscriptionType) ?? str(row.subscription);

  const usage = isObject(row.usage) ? row.usage : null;
  const lastGoodUsage = isObject(row.lastGoodUsage) ? row.lastGoodUsage : null;
  let { status, detail } = statusFromCswap(row, usage, email, slot);

  let windows: UsageWindow[];
  let lastGood = false;
  if (usage) {
    windows = cswapWindows(usage, observedAtOf(row.usageFetchedAt, row.usageAgeSeconds, nowMs));
    // cswap already applied its own freshness rule before calling this reading "ok"; vouch for its poll cadence.
    if (str(row.usageStatus) === "ok") {
      for (const w of windows) w.decisionMaxAgeMinutes = CSWAP_DECISION_MAX_AGE_MINUTES;
    }
  } else if (lastGoodUsage) {
    windows = cswapWindows(lastGoodUsage, observedAtOf(row.lastGoodFetchedAt, row.lastGoodAgeSeconds, nowMs));
    lastGood = windows.some((w) => w.usedPct !== null);
  } else {
    windows = unknownCoreWindows();
  }

  // A slot whose refresh token is dead (or missing) would hand Claude Code a login that fails on its next refresh.
  const blocked = SWITCH_REFUSED.has(str(row.usageStatus) ?? "") ? detail : undefined;
  if (row.disabled === true) {
    detail = detail ? `Disabled in claude-swap; ${detail}` : "Disabled in claude-swap";
    status = "disabled";
  }

  const label = alias || email || (slot !== null ? `Account ${slot}` : "Claude account");
  const account: Account = {
    provider: "claude",
    key: claudeKey(email, orgUuid),
    label,
    email,
    plan: planRaw ? clean(planRaw, 60) : null,
    workspace: orgName && !defaultOrg ? clean(orgName, 120) : null,
    active: row.active === true,
    status,
    windows,
  };
  if (alias) account.alias = alias;
  if (detail) account.statusDetail = clean(detail);
  if (lastGood) account.lastGood = true;
  if (slot !== null) account.switchTarget = { kind: "cswap", slot };
  if (blocked) account.switchBlocked = clean(blocked);
  // cswap repairs a foreign live credential by a switch to the active slot itself (switchClaude re-checks).
  if (row.active === true && slot !== null && str(row.usageStatus) === "foreign_credential") account.loginRepair = true;
  return account;
}

/**
 * Normalize `cswap --list --json`. Throws Error(sanitized) on an error envelope or a schemaVersion
 * other than 1. `nowMs` is only used to anchor `usageAgeSeconds` when `usageFetchedAt` is absent.
 * Two slots holding the same identity keep distinct keys: the lowest slot keeps the base key,
 * later ones get "#<slot>" appended.
 */
export function normalizeCswapList(data: unknown, nowMs?: number): Account[] {
  const payload = checkCswapPayload(data);
  if (!Array.isArray(payload.accounts)) throw new Error("claude-swap list output has no accounts array");
  const rows = payload.accounts.filter(isObject);
  const accounts = rows.map((row) => accountFromCswapRow(row, nowMs));
  const slotOf = (a: Account): number => (a.switchTarget?.kind === "cswap" ? a.switchTarget.slot : Infinity);
  const order = accounts.map((a, i) => ({ a, i })).sort((x, y) => slotOf(x.a) - slotOf(y.a) || x.i - y.i);
  const seen = new Set<string>();
  for (const { a, i } of order) {
    if (!seen.has(a.key)) {
      seen.add(a.key);
      continue;
    }
    const slot = slotOf(a);
    a.key = uniqueId(`${a.key}#${Number.isFinite(slot) ? slot : i + 1}`, seen);
  }
  return accounts;
}

function cswapNotices(payload: Json): string[] {
  const notices: string[] = [];
  for (const field of ["duplicateAccountWarnings", "lockstepUsageWarnings"]) {
    const list = payload[field];
    if (!Array.isArray(list)) continue;
    for (const item of list.slice(0, 5)) {
      const text = clean(item, 200);
      if (text) notices.push(text);
    }
  }
  return notices;
}

/**
 * Run a cswap query without ever signalling it. Rejects with DeadlineError when the UI deadline passes; the
 * child keeps running detached so a refresh-token rotation it started is still persisted. `onSpawn` records the
 * child in the provider lock, which then stays held until a detached child exits.
 */
async function queryCswap(
  file: string,
  args: readonly string[],
  deadlineMs: number,
  onSpawn?: (pid: number | undefined) => void,
): Promise<Json> {
  const what = `claude-swap ${args[0]}`;
  let res: RunResult;
  try {
    res = await runQueryNoKill(file, args, deadlineMs, onSpawn);
  } catch (error) {
    if (error instanceof DeadlineError) {
      throw new DeadlineError(`${what} is still running after ${Math.round(deadlineMs / 1000)} s`);
    }
    throw error;
  }
  if (res.signal) throw new Error(`${what} was terminated (${res.signal})`);
  let data: unknown;
  try {
    data = parseJsonOutput(res.stdout);
  } catch {
    throw new Error(`${what} returned no JSON (exit ${res.exitCode ?? "?"})${stderrHint(res.stderr)}`);
  }
  return checkCswapPayload(data);
}

// ---------------------------------------------------------------------------
// CodexBar ambient fallback

function codexbarPace(value: unknown): Pace | undefined {
  if (!isObject(value)) return undefined;
  const pace: Pace = {};
  const expected = finite(value.expectedUsedPercent);
  if (expected !== null) pace.expectedUsedPct = expected;
  if (typeof value.willLastToReset === "boolean") pace.willLastToReset = value.willLastToReset;
  // Only an absolute time; etaSeconds is relative to the backend's observation and is not re-anchored here.
  const eta = iso(value.projectedExhaustionAt);
  if (eta) pace.projectedExhaustionAt = eta;
  const summary = clean(value.summary, 120);
  if (summary) pace.summary = summary;
  const stage = clean(value.stage, 40);
  if (stage) pace.stage = stage;
  return Object.keys(pace).length > 0 ? pace : undefined;
}

function codexbarWindow(
  raw: unknown,
  base: Pick<UsageWindow, "id" | "kind" | "label">,
  defaultMinutes: number | null,
  observedAt: string | null,
  pace: Pace | undefined,
  usageKnown = true,
): UsageWindow | null {
  if (!isObject(raw)) return null;
  // A synthetic placeholder stands in for a lane the provider did not report; its 0% is not a reading.
  const known = usageKnown && raw.isSyntheticPlaceholder !== true;
  const w: UsageWindow = {
    ...base,
    usedPct: known ? pct(raw.usedPercent) : null,
    resetsAt: iso(raw.resetsAt),
    observedAt,
  };
  const minutes = finite(raw.windowMinutes);
  if (minutes !== null && minutes > 0) w.windowMinutes = minutes;
  else if (defaultMinutes !== null) w.windowMinutes = defaultMinutes;
  if (pace) w.pace = pace;
  return w;
}

/**
 * Normalize `codexbar usage --provider claude ... --json` into the single ambient Claude account.
 * Throws Error(sanitized) when the Claude row is missing or carries an error.
 * A row read from another source than the Claude Code login (e.g. "web": the claude.ai browser cookies) may be a
 * different account, so it is never marked active and never shares the ambient Claude Code key.
 */
export function normalizeCodexbarClaudeAmbient(data: unknown): Account[] {
  const rows = Array.isArray(data) ? data : [data];
  const row = rows.find((r) => isObject(r) && r.provider === "claude");
  if (!isObject(row)) throw new Error("CodexBar returned no Claude usage row");
  if (isObject(row.error)) {
    throw new Error(`CodexBar: ${clean(row.error.message) || "Claude usage unavailable"}`);
  }
  const usage = isObject(row.usage) ? row.usage : null;
  const identity = usage && isObject(usage.identity) ? usage.identity : null;
  const emailRaw = str(usage?.accountEmail) ?? str(identity?.accountEmail);
  const email = emailRaw ? clean(emailRaw, 254) : null;
  const org = str(usage?.accountOrganization) ?? str(identity?.accountOrganization);
  const defaultOrg = !!org && !!email && org.toLowerCase() === `${email.toLowerCase()}'s organization`;
  const plan = str(usage?.loginMethod) ?? str(identity?.loginMethod);
  const paces = isObject(row.pace) ? row.pace : {};
  const labels = isObject(row.rateWindowLabels) ? row.rateWindowLabels : {};

  let windows: UsageWindow[] = [];
  if (usage) {
    const observedAt = iso(usage.updatedAt);
    const seen = new Set<string>(["session", "weekly"]);
    const session = codexbarWindow(
      usage.primary,
      { id: "session", kind: "session", label: "5h" },
      300,
      observedAt,
      codexbarPace(paces.primary),
    );
    const weekly = codexbarWindow(
      usage.secondary,
      { id: "weekly", kind: "weekly", label: "Weekly" },
      10080,
      observedAt,
      codexbarPace(paces.secondary),
    );
    if (session) windows.push(session);
    if (weekly) windows.push(weekly);
    const tertiaryLabel = clean(labels.tertiary, 60) || "Opus";
    const tertiary = codexbarWindow(
      usage.tertiary,
      { id: uniqueId(`scoped:${tertiaryLabel}`, seen), kind: "scoped", label: tertiaryLabel },
      10080,
      observedAt,
      codexbarPace(paces.tertiary),
    );
    if (tertiary) windows.push(tertiary);
    if (Array.isArray(usage.extraRateWindows)) {
      for (const extra of usage.extraRateWindows) {
        if (!isObject(extra)) continue;
        const name = clean(str(extra.title)?.replace(/\s+only$/i, "") ?? extra.id, 60);
        if (!name) continue;
        const w = codexbarWindow(
          extra.window,
          { id: uniqueId(`scoped:${name}`, seen), kind: "scoped", label: name },
          null,
          observedAt,
          undefined,
          extra.usageKnown !== false,
        );
        if (w) windows.push(w);
      }
    }
    windows = withCoreWindows(windows);
  } else {
    windows = unknownCoreWindows();
  }

  const hasCoreNumbers = windows.some((w) => (w.kind === "session" || w.kind === "weekly") && w.usedPct !== null);
  const source = str(row.source)?.toLowerCase() ?? null;
  const otherSession = source !== null && !CLAUDE_CODE_SOURCES.has(source);
  const account: Account = {
    provider: "claude",
    key: claudeKey(email, null),
    label: email ?? "Current Claude login",
    email,
    plan: plan ? clean(plan, 60) : null,
    workspace: org && !defaultOrg ? clean(org, 120) : null,
    active: true,
    status: hasCoreNumbers ? "ok" : "unavailable",
    windows,
  };
  if (!hasCoreNumbers) account.statusDetail = "CodexBar returned no Claude usage";
  if (otherSession) {
    const what = source === "web" ? "claude.ai browser session" : `CodexBar ${clean(source, 20)} session`;
    account.key = claudeKey(email, null).replace(/^claude:/, `claude:${source === "web" ? "web" : "other"}:`);
    account.label = email ? `${what} (${email})` : what;
    account.active = "unknown";
    account.statusDetail = clean(
      `${account.statusDetail ? `${account.statusDetail}; ` : ""}Read from the ${what}, which may not be the Claude Code login`,
    );
  }
  return [account];
}

async function queryCodexbarClaude(file: string, source: "oauth" | "cli"): Promise<Account[]> {
  const res = await runQuery(
    file,
    ["usage", "--provider", "claude", "--source", source, "--no-credits", "--json"],
    CODEXBAR_TIMEOUT_MS,
  );
  if (res.timedOut) throw new Error(`timed out after ${CODEXBAR_TIMEOUT_MS / 1000} s`);
  if (res.signal) throw new Error(`terminated (${res.signal})`);
  let data: unknown;
  try {
    data = parseJsonOutput(res.stdout);
  } catch {
    throw new Error(`no JSON (exit ${res.exitCode ?? "?"})${stderrHint(res.stderr)}`);
  }
  return normalizeCodexbarClaudeAmbient(data);
}

// ---------------------------------------------------------------------------
// Fetch

/** Absolute path of an executable regular file, or null with the reason it cannot be used. */
function usableExecutable(configured: string): { file: string | null; problem?: string } {
  let file: string;
  try {
    file = resolveExecutable(configured);
  } catch (error) {
    return { file: null, problem: errorText(error) };
  }
  try {
    if (!fs.statSync(file).isFile()) return { file: null };
    fs.accessSync(file, fs.constants.X_OK);
    return { file };
  } catch {
    return { file: null };
  }
}

function isMissingExecutable(error: unknown): boolean {
  return error instanceof ExecError && (error.code === "ENOENT" || error.code === "EACCES");
}

async function fetchAmbient(cfg: ClaudeConfig, notices: string[]): Promise<ProviderFetch> {
  const codexbar = usableExecutable(cfg.codexbarPath);
  if (!codexbar.file) {
    throw new Error(clean(`claude-swap is not installed and the CodexBar CLI is not available at ${cfg.codexbarPath}`));
  }
  const failures: string[] = [];
  // "cli" is the Claude Code PTY only. "auto" would try the claude.ai browser session first, which can be another
  // account than the Claude Code login.
  for (const source of ["oauth", "cli"] as const) {
    try {
      const accounts = await queryCodexbarClaude(codexbar.file, source);
      const extra = accounts.some((a) => a.active !== true) ? [BROWSER_SESSION_NOTICE] : [];
      return {
        provider: "claude",
        source: "codexbar-ambient",
        accounts,
        notices: [...notices, AMBIENT_NOTICE, ...extra],
      };
    } catch (error) {
      if (isMissingExecutable(error)) throw new Error(`claude-swap is not installed and ${errorText(error)}`);
      failures.push(`${source}: ${errorText(error)}`);
    }
  }
  throw new Error(
    clean(`claude-swap is not installed and CodexBar could not read the Claude login (${failures.join("; ")})`),
  );
}

/**
 * When no claude-swap slot is active, ask `cswap --status` who is logged in. An unmanaged live login becomes an
 * active row without a switch target (its usage is unknown), so the current login stays visible. Best effort:
 * any failure returns null and the rows stay as they are.
 */
async function unmanagedLiveAccount(
  file: string,
  accounts: Account[],
  deadlineMs: number,
  onSpawn?: (pid: number | undefined) => void,
): Promise<Account | null> {
  let status: Json;
  try {
    status = await queryCswap(file, STATUS_ARGS, deadlineMs, onSpawn);
  } catch {
    return null;
  }
  const active = isObject(status.active) ? status.active : null;
  if (!active || active.managed !== false) return null;
  const emailRaw = str(active.email);
  if (!emailRaw) return null;
  const email = clean(emailRaw, 254);
  const keys = new Set(accounts.map((a) => a.key));
  const base = claudeKey(email, null);
  return {
    provider: "claude",
    key: keys.has(base) ? uniqueId(`${base}#live`, keys) : base,
    label: `${email} (not in claude-swap)`,
    email,
    plan: null,
    workspace: null,
    active: true,
    status: "unavailable",
    statusDetail: clean(`Not in claude-swap: run cswap add while logged in as ${email} to track and switch it`),
    windows: unknownCoreWindows(),
  };
}

/**
 * Register the untracked live Claude Code login (`cswap add` without a slot: appends a slot, or refreshes an
 * existing one in place; it never prompts). The add is a mutation, so it is never signalled. Returns the re-listed
 * accounts on success, or a sanitized error to show; the caller then keeps the unmanaged row.
 */
async function addCurrentLogin(
  file: string,
  live: Account,
  deadlineMs: number,
  hooks?: { onSpawn?: (pid: number | undefined) => void },
): Promise<{ accounts?: Account[]; notices: string[]; error?: string }> {
  let res: RunResult;
  try {
    res = await runMutation(file, ADD_ARGS, hooks?.onSpawn);
  } catch (error) {
    return { notices: [], error: clean(`Could not add ${live.email} to claude-swap: ${errorText(error)}`) };
  }
  if (res.signal || res.exitCode !== 0) {
    const why = clean(res.stderr || res.stdout, 160) || `exit ${res.exitCode ?? res.signal ?? "?"}`;
    return { notices: [], error: clean(`Could not add ${live.email} to claude-swap: ${why}`) };
  }
  let payload: Json;
  try {
    payload = await queryCswap(file, LIST_ARGS, deadlineMs, hooks?.onSpawn);
  } catch (error) {
    return { notices: [], error: clean(`Added ${live.email} to claude-swap; refresh to see it (${errorText(error)})`) };
  }
  const accounts = normalizeCswapList(payload, Date.now());
  const slot = accounts.find((a) => a.active === true && sameEmail(a.email, live.email));
  const where = slot?.switchTarget?.kind === "cswap" ? ` as account ${slot.switchTarget.slot}` : "";
  const notices = [...cswapNotices(payload), clean(`Added the new Claude login ${live.email}${where}`)];
  // cswap registers even when it cannot prove the stored credential belongs to this account; say so.
  if (/could not verify/i.test(res.stdout)) {
    notices.push(clean(`claude-swap could not verify the saved login for ${live.email}; check it with cswap list`));
  }
  if (slot && slot.status !== "ok") {
    notices.push(clean(`${live.email} was added but has no subscription usage: ${slot.statusDetail ?? slot.status}`));
  }
  return { accounts, notices };
}

const AUTO_ADD_BACKOFF_MS = 30 * 60_000;

function rememberTracked(cfg: ClaudeConfig, memory: AutoAddState | null, accounts: Account[]): void {
  if (!memory || !cfg.autoAddStatePath) return;
  const before = memory.tracked.length;
  for (const a of accounts) {
    const email = a.switchTarget?.kind === "cswap" ? a.email?.trim().toLowerCase() : null;
    if (email && !memory.tracked.includes(email)) memory.tracked.push(email);
  }
  if (memory.tracked.length !== before) writeAutoAddState(cfg.autoAddStatePath, memory);
}

function rememberAutoAdd(
  cfg: ClaudeConfig,
  memory: AutoAddState | null,
  live: Account,
  added: { accounts?: Account[]; error?: string },
): void {
  const email = live.email?.trim().toLowerCase();
  if (!memory || !cfg.autoAddStatePath || !email) return;
  if (added.accounts) delete memory.failures[email];
  else memory.failures[email] = { at: new Date().toISOString(), error: added.error ?? "failed" };
  writeAutoAddState(cfg.autoAddStatePath, memory);
}

/**
 * Why an untracked live login must not be auto-added right now (a notice to show), or null to go ahead:
 *  - claude-swap tracked this email before and it was removed: respect the removal;
 *  - an auto-add of this email failed less than 30 min ago: back off;
 *  - Claude Code reports a Console / API-key login, or a different login than cswap saw: not a subscription
 *    login to register (or a login in flux); `claude auth status` is only consulted when its path is set.
 */
async function autoAddSkipReason(
  live: Account,
  cfg: ClaudeConfig,
  memory: AutoAddState | null,
): Promise<string | null> {
  const email = live.email?.trim().toLowerCase();
  if (!email) return "Claude Code's current login has no email; add it with Add Claude Account";
  if (memory?.tracked.includes(email)) {
    return clean(
      `${live.email} was removed from claude-swap, so it is not re-added automatically. Use Add Claude Account (⌘N) to track it again.`,
    );
  }
  const failure = memory?.failures[email];
  const failedAt = failure ? Date.parse(failure.at) : NaN;
  if (failure && Number.isFinite(failedAt) && Date.now() - failedAt < AUTO_ADD_BACKOFF_MS) {
    return clean(`${failure.error} (automatic retry after 30 min; or use Add Claude Account)`);
  }
  if (!cfg.claudePath) return null;
  const claude = usableExecutable(cfg.claudePath);
  if (!claude.file) return null;
  let status: Json;
  try {
    const res = await runQuery(claude.file, ["auth", "status", "--json"], 15_000);
    const data = parseJsonOutput(res.stdout);
    if (!isObject(data)) throw new Error("no JSON");
    status = data;
  } catch {
    return clean(`Could not confirm ${live.email} is a Claude subscription login; not added automatically this time`);
  }
  const method = str(status.authMethod);
  if (method && method !== "claude.ai") {
    return clean(
      `Claude Code is signed in to ${live.email} with ${method}; claude-swap tracks Claude subscription logins only`,
    );
  }
  if (!sameEmail(str(status.email), live.email)) {
    return "Claude Code's login changed while checking it; it is added on the next refresh";
  }
  return null;
}

/**
 * Mark rows that have a Claude desktop app instance signed in (inClaudeApp, claudeAppInstance), and add an
 * "add this account" row for each app account claude-swap does not track. `appAccounts` lists every instance's
 * account (regular app + per-account folders); omitted, only the regular app's config is read.
 * Identity comes from account UUIDs only (never credentials).
 */
export function withClaudeAppAccount(
  accounts: Account[],
  paths: ClaudeLoginPaths,
  appAccounts?: { uuid: string; kind: "default" | "profile" }[],
): Account[] {
  const regular = readClaudeAppAccountUuid(paths);
  const apps = appAccounts ?? (regular ? [{ uuid: regular, kind: "default" as const }] : []);
  if (apps.length === 0) return accounts;
  const slotUuids = readCswapAccountUuids(paths);
  const tracked = new Set(slotUuids.values());
  const kindOf = new Map<string, "default" | "profile">();
  for (const a of apps) if (!kindOf.has(a.uuid) || a.kind === "default") kindOf.set(a.uuid, a.kind);
  const marked = accounts.map((a) => {
    const slot = a.switchTarget?.kind === "cswap" ? a.switchTarget.slot : null;
    const uuid = slot !== null ? slotUuids.get(slot) : undefined;
    const kind = uuid ? kindOf.get(uuid) : undefined;
    return kind ? { ...a, inClaudeApp: true, claudeAppInstance: kind } : a;
  });
  for (const [uuid, kind] of kindOf) {
    // A slot that exists in sequence.json but did not come back in this list still counts as tracked.
    if (tracked.has(uuid)) continue;
    marked.push({
      provider: "claude",
      key: `claude:app|${uuid}`,
      label: kind === "default" ? "New account in the Claude app" : "New account in a separate Claude app",
      email: null,
      plan: null,
      workspace: null,
      active: false,
      status: "unavailable",
      statusDetail:
        "A Claude desktop app is signed in to an account that is not tracked yet. Add it: sign in once in the " +
        "terminal that opens, and it shows up here with its 5h and weekly usage.",
      windows: unknownCoreWindows(),
      needsAdd: true,
      inClaudeApp: true,
      claudeAppInstance: kind,
    });
  }
  return marked;
}

/** `hooks.onSpawn` records each cswap child in the caller's provider lock (see queryCswap). */
export async function fetchClaude(
  cfg: ClaudeConfig,
  hooks?: { onSpawn?: (pid: number | undefined) => void },
): Promise<ProviderFetch> {
  const cswap = usableExecutable(cfg.cswapPath);
  const notices: string[] = [];
  const deadlineMs = cfg.queryDeadlineMs ?? CSWAP_DEADLINE_MS;
  if (cswap.file) {
    let payload: Json | null = null;
    try {
      payload = await queryCswap(cswap.file, LIST_ARGS, deadlineMs, hooks?.onSpawn);
    } catch (error) {
      // cswap keeps running detached; the refresh fails so the previous snapshot stays.
      if (error instanceof DeadlineError) throw new Error(CSWAP_BUSY);
      // The binary disappeared between the check and the spawn: treat it as not installed.
      if (!isMissingExecutable(error)) throw error;
    }
    if (payload) {
      let accounts = normalizeCswapList(payload, Date.now());
      notices.push(...cswapNotices(payload));
      const inventoryEmpty = accounts.length === 0;
      const memory = cfg.autoAddStatePath ? readAutoAddState(cfg.autoAddStatePath) : null;
      rememberTracked(cfg, memory, accounts);
      if (!accounts.some((a) => a.active === true)) {
        const live = await unmanagedLiveAccount(
          cswap.file,
          accounts,
          Math.min(deadlineMs, CSWAP_LOOKUP_DEADLINE_MS),
          hooks?.onSpawn,
        );
        let added: Awaited<ReturnType<typeof addCurrentLogin>> | null = null;
        if (live && cfg.autoAddLogins) {
          const skip = await autoAddSkipReason(live, cfg, memory);
          if (skip) notices.push(skip);
          else {
            added = await addCurrentLogin(cswap.file, live, deadlineMs, hooks);
            rememberAutoAdd(cfg, memory, live, added);
          }
        }
        if (added?.accounts) {
          accounts = added.accounts;
          notices.push(...added.notices);
          rememberTracked(cfg, memory, accounts);
        } else if (live) {
          if (added?.error) notices.push(added.error);
          accounts.push(live);
          if (accounts.length > 1 && !added) {
            notices.push(
              clean(
                `Claude Code is logged in as ${live.email}, which claude-swap does not manage. Run cswap add to track it.`,
              ),
            );
          }
        }
      }
      if (inventoryEmpty && !accounts.some((a) => a.switchTarget?.kind === "cswap")) {
        notices.push("claude-swap has no accounts yet. Run cswap add while logged in to Claude Code.");
      }
      if (cfg.loginPaths) accounts = withClaudeAppAccount(accounts, cfg.loginPaths);
      return { provider: "claude", source: "cswap", accounts, notices };
    }
  } else if (cswap.problem) {
    notices.push(clean(`claude-swap path setting is invalid: ${cswap.problem}`));
  }
  return fetchAmbient(cfg, notices);
}

// ---------------------------------------------------------------------------
// Switch

type ClaudeSwitchResult = SwitchResult & { activeKey?: string };

const ACCOUNT_CHANGED = "The claude-swap account changed since the list loaded; refresh and pick again";

function resolveTarget(accounts: Account[], req: SwitchRequest): { account?: Account; problem?: string } {
  const byKey = accounts.filter((a) => a.key === req.targetKey);
  if (byKey.length === 1) return { account: byKey[0] };
  if (req.expectedEmail) {
    const byEmail = accounts.filter((a) => sameEmail(a.email, req.expectedEmail));
    if (byEmail.length === 0) return { problem: "Account not found in claude-swap" };
    // cswap identifies an account by (email, organization). Only a request made without an organization (a
    // legacy slot cswap migrated since) may resolve by email; otherwise the email now names another identity.
    if (orgFromKey(req.targetKey) !== "") return { problem: ACCOUNT_CHANGED };
    if (byEmail.length === 1) return { account: byEmail[0] };
    return { problem: `Several claude-swap slots hold ${clean(req.expectedEmail, 254)}; refresh and pick one` };
  }
  return { problem: "Account not found in claude-swap" };
}

/** Raw `usageStatus` of a slot in a cswap list payload. */
function usageStatusOfSlot(payload: Json, slot: number): string | null {
  const rows = Array.isArray(payload.accounts) ? payload.accounts.filter(isObject) : [];
  const row = rows.find((r) => r.number === slot);
  return row ? str(row.usageStatus) : null;
}

const UNKNOWN_SUFFIX = "The switch may or may not have happened; refresh before switching again.";
const REPAIR_UNCONFIRMED =
  "The Claude login repair could not be confirmed; if the foreign-login error persists, switch to another account and back.";

export async function switchClaude(
  req: SwitchRequest,
  cfg: ClaudeConfig,
  hooks?: { onSpawn?: (pid: number | undefined) => void },
): Promise<ClaudeSwitchResult> {
  if (req.provider !== "claude") return { state: "failed", message: "Not a Claude switch request" };
  const cswap = usableExecutable(cfg.cswapPath);
  if (!cswap.file) {
    return { state: "failed", message: "claude-swap is not installed; Claude switching needs cswap" };
  }
  const deadlineMs = cfg.queryDeadlineMs ?? CSWAP_DEADLINE_MS;

  // 1. Resolve the current slot of the requested identity right before switching (one --list pass per switch).
  let listed: Json;
  let accounts: Account[];
  try {
    listed = await queryCswap(cswap.file, LIST_ARGS, deadlineMs, hooks?.onSpawn);
    accounts = normalizeCswapList(listed, Date.now());
  } catch (error) {
    if (error instanceof DeadlineError) {
      return {
        state: "failed",
        message: "claude-swap is still refreshing its accounts; nothing was switched. Retry shortly.",
      };
    }
    return { state: "failed", message: clean(`Could not read claude-swap accounts: ${errorText(error)}`) };
  }
  const { account: target, problem } = resolveTarget(accounts, req);
  if (!target) return { state: "failed", message: problem ?? "Account not found in claude-swap" };
  if (target.switchTarget?.kind !== "cswap") {
    return { state: "failed", message: "This Claude account has no claude-swap slot" };
  }
  const slot = target.switchTarget.slot;
  const expectedEmail = req.expectedEmail ?? target.email;
  if (!expectedEmail || (req.expectedEmail && !sameEmail(target.email, req.expectedEmail))) {
    return { state: "failed", message: "The claude-swap account changed since the list loaded; refresh and retry" };
  }
  const label = clean(req.targetLabel, 120) || target.label;
  const usageStatus = usageStatusOfSlot(listed, slot);

  // 2. Already the default login. cswap repairs a foreign live credential by a switch to the active slot itself.
  const repair = target.active === true && usageStatus === "foreign_credential";
  if (target.active === true && !repair) {
    return { state: "noop", message: `Claude is already using ${label}`, activeKey: target.key };
  }

  // 3. Slots cswap would activate but Claude Code cannot use.
  if (!repair && target.switchBlocked) return { state: "failed", message: target.switchBlocked };
  if (!repair && usageStatus === "keychain_unavailable") {
    return {
      state: "failed",
      message: "claude-swap cannot read the keychain right now (locked or unavailable); nothing was switched. Retry.",
    };
  }

  // 4. Mutation: never killed, never timed out.
  let res: RunResult;
  try {
    res = await runMutation(cswap.file, ["--switch-to", String(slot), "--json"], hooks?.onSpawn);
  } catch (error) {
    return { state: "failed", message: clean(`Could not start claude-swap: ${errorText(error)}`) };
  }
  const unknown = (message: string): ClaudeSwitchResult =>
    repair ? { state: "unknown", message, warning: REPAIR_UNCONFIRMED } : { state: "unknown", message };

  // 5. Strict result parsing.
  if (res.signal) {
    return unknown(`claude-swap was interrupted (${res.signal}). ${UNKNOWN_SUFFIX}`);
  }
  let payload: unknown;
  try {
    payload = parseJsonOutput(res.stdout);
  } catch {
    return unknown(clean(`claude-swap returned unreadable output (exit ${res.exitCode ?? "?"}). ${UNKNOWN_SUFFIX}`));
  }
  if (!isObject(payload) || payload.schemaVersion !== 1) {
    return unknown(`claude-swap returned an unsupported result. ${UNKNOWN_SUFFIX}`);
  }
  if (isObject(payload.error)) {
    // Handled cswap errors are transactional (rolled back); an envelope with exit 0 is inconsistent.
    if (res.exitCode !== 0) return { state: "failed", message: cswapErrorMessage(payload.error) };
    return unknown(`claude-swap reported an error with exit 0. ${UNKNOWN_SUFFIX}`);
  }
  const to = isObject(payload.to) ? payload.to : null;
  const toEmail = to ? str(to.email) : null;
  if (res.exitCode !== 0 || !to || to.number !== slot || (toEmail !== null && !sameEmail(toEmail, expectedEmail))) {
    return unknown(`claude-swap did not confirm a switch to slot ${slot}. ${UNKNOWN_SUFFIX}`);
  }
  const warnings = Array.isArray(payload.warnings) ? payload.warnings.map((w) => clean(w, 160)).filter(Boolean) : [];

  // 6. Verify the live identity independently of the switch output: same slot, same email, same organization.
  let status: Json;
  try {
    status = await queryCswap(cswap.file, STATUS_ARGS, deadlineMs, hooks?.onSpawn);
  } catch (error) {
    return unknown(
      clean(
        `claude-swap reported switching to ${label}, but it could not be verified (${errorText(error)}). ` +
          "Refresh before switching again.",
      ),
    );
  }
  const active = isObject(status.active) ? status.active : null;
  const activeEmail = active ? str(active.email) : null;
  // An empty organization is a value (a personal or legacy slot), never a wildcard.
  const activeOrg =
    active && typeof active.organizationUuid === "string" ? active.organizationUuid.trim().toLowerCase() : null;
  const activeNumber = active && typeof active.number === "number" ? active.number : null;
  const targetOrg = orgFromKey(target.key);
  const managed = !!active && active.managed === true;
  const emailOk = sameEmail(activeEmail, expectedEmail);
  const orgOk = activeOrg !== null && activeOrg === targetOrg;
  // cswap resolves --status by identity, so an identical duplicate in a lower slot is reported instead of the target.
  const slotOk =
    activeNumber === slot ||
    (activeNumber !== null &&
      accounts.some(
        (a) =>
          a.switchTarget?.kind === "cswap" &&
          a.switchTarget.slot === activeNumber &&
          baseKey(a.key) === baseKey(target.key),
      ));
  if (!managed || !emailOk || !orgOk || !slotOk) {
    const now = activeEmail ? clean(activeEmail, 254) : "no managed account";
    let what: string;
    if (!managed) what = activeEmail ? `${now}, which claude-swap does not manage` : now;
    else if (!emailOk) what = `${now}, not ${clean(expectedEmail, 254)}`;
    else if (!orgOk) what = `${now} in a different organization`;
    else what = `${now} in slot ${activeNumber ?? "?"}, not slot ${slot}`;
    return unknown(clean(`After the switch Claude reports ${what}. ${UNKNOWN_SUFFIX}`));
  }
  const activeKey = claudeKey(activeEmail, activeOrg);
  const resolvedKey = activeKey === baseKey(target.key) ? target.key : activeKey;
  const note = warnings.length > 0 ? ` ${warnings[0]}` : "";

  if (repair) {
    if (str(active?.usageStatus) === "foreign_credential") {
      return {
        state: "failed",
        message: clean(
          `claude-swap could not repair the Claude login for ${label}: it still belongs to another account. ` +
            `Switch to another account and back, or run cswap --switch-to ${slot} in a terminal.`,
          400,
        ),
      };
    }
    // cswap reports a preserved foreign credential as a warning; without one it may have found nothing it could
    // verify (e.g. offline) and left the live login untouched.
    if (warnings.length === 0) {
      return unknown(
        clean(`claude-swap did not report a repair of the Claude login for ${label}. Refresh to check it.`),
      );
    }
    return {
      state: "succeeded",
      message: clean(`Repaired the Claude login for ${label}.${note}`, 400),
      activeKey: resolvedKey,
    };
  }
  return {
    state: "succeeded",
    message: clean(`Claude → ${label}. Running Claude Code picks it up within ~30 s.${note}`, 400),
    activeKey: resolvedKey,
  };
}
