import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseJsonOutput, resolveExecutable, runQuery, sanitize } from "./exec";
import { decodeJwtPayload } from "./jwt";
import { Account, AccountStatus, Pace, ProviderFetch, SwitchTarget, UsageWindow } from "./model";

// Codex read side. Usage rows come from CodexBar's CLI (one row per account it knows). CodexBar does
// not flag which row is the live system account (~/.codex), so this module reads the live login's
// identity claims and CodexBar's managed-account store to mark the active row and attach switch targets.
// auth.json holds tokens: only identity claims leave readLiveIdentity, never token values.

export interface CodexPaths {
  codexHome: string;
  codexbarSupportDir: string;
}

export function defaultCodexPaths(): CodexPaths {
  const home = os.homedir();
  return {
    codexHome: process.env.CODEX_HOME?.trim() || path.join(home, ".codex"),
    codexbarSupportDir: path.join(home, "Library", "Application Support", "CodexBar"),
  };
}

export const CODEXBAR_USAGE_ARGS: readonly string[] = [
  "usage",
  "--provider",
  "codex",
  "--all-accounts",
  "--source",
  "oauth",
  "--no-credits",
  "--json",
];

export const CODEXBAR_TIMEOUT_MS = 45_000;

/** CodexBar's managed-codex-accounts.json format version this module understands (CodexBar 0.69.0). */
export const MANAGED_STORE_MAX_VERSION = 3;

export const NOTICE_LIVE_UNMANAGED =
  "Your current Codex account is not saved in CodexBar yet. Switch once from CodexBar's menu so it is preserved before one-key switching.";
export const NOTICE_LIVE_UNREADABLE = "Could not read the current Codex login";
export const NOTICE_LIVE_UNMATCHED = "Could not match the current Codex login to a CodexBar account";

/** Account.switchBlocked reasons: a direct switch away from the live login is refused until it is fixed. */
export const BLOCKED_LIVE_UNMANAGED =
  "Your current Codex login is not saved in CodexBar yet; switch once from CodexBar";
export const BLOCKED_LIVE_NOT_CHATGPT = "Your current Codex login is not a ChatGPT login; switch from CodexBar";
/** The target row has no direct switch target (not saved in CodexBar, or not told apart from another row). */
export const CODEX_TARGET_NOT_SAVED = "This Codex account is not saved in CodexBar; switch to it from CodexBar once.";

type JsonObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function lowerOrNull(value: unknown): string | null {
  return nonEmptyString(value)?.toLowerCase() ?? null;
}

function sameText(a: string | null, b: string | null): boolean {
  return a !== null && b !== null && a.toLowerCase() === b.toLowerCase();
}

// ---------------------------------------------------------------------------
// Live login (<codexHome>/auth.json)

export interface LiveIdentity {
  email: string | null;
  accountId: string | null;
  authMode: string | null;
  isSymlink: boolean;
}

// Mirrors codex-rs AuthDotJson::resolved_mode, except that an empty file resolves to null, not "chatgpt".
function resolveAuthMode(auth: JsonObject, tokens: JsonObject | null): string | null {
  const explicit = nonEmptyString(auth.auth_mode);
  if (explicit) return explicit;
  if (auth.personal_access_token != null) return "personalAccessToken";
  if (auth.bedrock_api_key != null) return "bedrockApiKey";
  if (auth.bedrock_access_keys != null) return "bedrockAccessKeys";
  if (auth.OPENAI_API_KEY != null) return "apikey";
  return tokens ? "chatgpt" : null;
}

/** Identity of the live Codex login, or null when auth.json is missing or unreadable. Never returns token values. */
export function readLiveIdentity(paths: CodexPaths): LiveIdentity | null {
  const file = path.join(paths.codexHome, "auth.json");
  let isSymlink: boolean;
  let auth: unknown;
  try {
    isSymlink = fs.lstatSync(file).isSymbolicLink();
    auth = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
  if (!isRecord(auth)) return null;
  const tokens = isRecord(auth.tokens) ? auth.tokens : null;
  const claims = tokens ? decodeJwtPayload(tokens.id_token ?? tokens.idToken) : null;
  const authRaw = claims?.["https://api.openai.com/auth"];
  const profileRaw = claims?.["https://api.openai.com/profile"];
  const authClaims = isRecord(authRaw) ? authRaw : null;
  const profileClaims = isRecord(profileRaw) ? profileRaw : null;
  return {
    email: lowerOrNull(claims?.email) ?? lowerOrNull(profileClaims?.email),
    accountId:
      lowerOrNull(tokens?.account_id) ??
      lowerOrNull(tokens?.accountId) ??
      lowerOrNull(authClaims?.chatgpt_account_id) ??
      lowerOrNull(claims?.chatgpt_account_id),
    authMode: resolveAuthMode(auth, tokens),
    isSymlink,
  };
}

// ---------------------------------------------------------------------------
// CodexBar managed-account store and workspace label cache

export interface ManagedCodexAccount {
  id: string;
  email: string;
  managedHomePath: string;
  workspaceAccountID: string | null;
  workspaceLabel: string | null;
  providerAccountID: string | null;
}

export interface ManagedStoreRead {
  accounts: ManagedCodexAccount[];
  /** Why the store could not be used (unsupported version, unreadable). null when read fine or absent. */
  notice: string | null;
}

function parseManagedEntry(value: unknown): ManagedCodexAccount | null {
  if (!isRecord(value)) return null;
  const id = nonEmptyString(value.id);
  const email = lowerOrNull(value.email);
  const managedHomePath = nonEmptyString(value.managedHomePath);
  if (!id || !email || !managedHomePath) return null;
  return {
    id,
    email,
    managedHomePath,
    workspaceAccountID: lowerOrNull(value.workspaceAccountID),
    workspaceLabel: nonEmptyString(value.workspaceLabel),
    providerAccountID: lowerOrNull(value.providerAccountID),
  };
}

function effectiveWorkspaceId(account: ManagedCodexAccount): string | null {
  return account.workspaceAccountID ?? account.providerAccountID;
}

/**
 * Reads managed-codex-accounts.json the way CodexBar does: versions 1..3 accepted, anything newer or
 * any malformed entry makes the whole store unusable (returned as [] plus a notice). Missing file = no accounts.
 */
export function readManagedStore(paths: CodexPaths): ManagedStoreRead {
  const file = path.join(paths.codexbarSupportDir, "managed-codex-accounts.json");
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { accounts: [], notice: null };
    return { accounts: [], notice: "Could not read CodexBar's saved Codex accounts" };
  }
  const unreadable: ManagedStoreRead = {
    accounts: [],
    notice: "CodexBar's saved Codex accounts file has an unexpected format",
  };
  if (!isRecord(raw) || !Array.isArray(raw.accounts)) return unreadable;
  const version = raw.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) return unreadable;
  if (version > MANAGED_STORE_MAX_VERSION) {
    return {
      accounts: [],
      notice: `CodexBar's saved Codex accounts use format version ${version}; this extension supports up to ${MANAGED_STORE_MAX_VERSION}. Update the extension.`,
    };
  }
  const parsed: ManagedCodexAccount[] = [];
  for (const entry of raw.accounts) {
    const account = parseManagedEntry(entry);
    if (!account) return unreadable;
    parsed.push(account);
  }
  // Same de-duplication as CodexBar's ManagedCodexAccountSet: by id, then by (email, workspace id) or legacy email.
  const seenIds = new Set<string>();
  const seenWorkspaceKeys = new Set<string>();
  const seenLegacyEmails = new Set<string>();
  const accounts: ManagedCodexAccount[] = [];
  for (const account of parsed) {
    const idKey = account.id.toLowerCase();
    if (seenIds.has(idKey)) continue;
    seenIds.add(idKey);
    const workspaceId = effectiveWorkspaceId(account);
    if (workspaceId) {
      const key = `${account.email}\u0000${workspaceId}`;
      if (seenWorkspaceKeys.has(key)) continue;
      seenWorkspaceKeys.add(key);
    } else {
      if (seenLegacyEmails.has(account.email)) continue;
      seenLegacyEmails.add(account.email);
    }
    accounts.push(account);
  }
  return { accounts, notice: null };
}

export function readManagedAccounts(paths: CodexPaths): ManagedCodexAccount[] {
  return readManagedStore(paths).accounts;
}

/** codex-openai-workspaces.json labelsByWorkspaceAccountID, keys lowercased. {} when missing or not version 1 (as CodexBar). */
export function readWorkspaceLabels(paths: CodexPaths): Record<string, string> {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(paths.codexbarSupportDir, "codex-openai-workspaces.json"), "utf8"));
  } catch {
    return {};
  }
  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.labelsByWorkspaceAccountID)) return {};
  const labels: Record<string, string> = {};
  for (const [id, label] of Object.entries(raw.labelsByWorkspaceAccountID)) {
    const key = id.trim().toLowerCase();
    const value = nonEmptyString(label);
    if (key && value) labels[key] = sanitize(value, 120);
  }
  return labels;
}

function labelFor(labels: Record<string, string>, accountId: string | null): string | null {
  if (!accountId) return null;
  const key = accountId.toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(labels, key)) return null;
  const value = labels[key];
  return typeof value === "string" && value ? value : null;
}

// ---------------------------------------------------------------------------
// Row normalization

export function codexKey(email: string | null, workspaceLabel: string | null): string {
  return `codex:${email?.trim().toLowerCase() || "unknown"}|${workspaceLabel?.trim() ?? ""}`;
}

export interface NormalizeContext {
  managed: ManagedCodexAccount[];
  workspaceLabels: Record<string, string>;
  live: LiveIdentity | null;
}

const ACCOUNT_SUFFIX = " — ";
// CodexBar appends " · <8 hex>" (sha256 prefix of the workspace id) when two rows would otherwise share a label.
const DISCRIMINATOR = /^(.*) · ([0-9a-f]{8})$/;

function splitAccountLabel(account: string | null): { head: string | null; suffix: string | null } {
  if (!account) return { head: null, suffix: null };
  const at = account.indexOf(ACCOUNT_SUFFIX);
  if (at < 0) return { head: account, suffix: null };
  return {
    head: account.slice(0, at).trim() || null,
    suffix: account.slice(at + ACCOUNT_SUFFIX.length).trim() || null,
  };
}

function discriminatorOf(identity: string): string {
  return crypto.createHash("sha256").update(identity, "utf8").digest("hex").slice(0, 8);
}

/** The managed entry a row belongs to, or null when there is none or the match is ambiguous. */
function matchManaged(
  email: string | null,
  suffix: string | null,
  managed: ManagedCodexAccount[],
): ManagedCodexAccount | null {
  if (!email) return null;
  const sameEmail = managed.filter((m) => m.email === email.toLowerCase());
  if (sameEmail.length === 0) return null;
  let pool: ManagedCodexAccount[];
  if (suffix === null) {
    // CodexBar omits the suffix only for an unlabeled or "Personal" workspace.
    pool = sameEmail.filter((m) => m.workspaceLabel === null || m.workspaceLabel.toLowerCase() === "personal");
  } else {
    const disc = DISCRIMINATOR.exec(suffix);
    if (disc) {
      pool = sameEmail.filter((m) =>
        [m.workspaceAccountID, m.providerAccountID, m.id.toLowerCase()].some(
          (identity) => identity !== null && discriminatorOf(identity) === disc[2],
        ),
      );
    } else {
      pool = sameEmail.filter((m) => sameText(m.workspaceLabel, suffix));
    }
  }
  return pool.length === 1 ? pool[0] : null;
}

function isoOrNull(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && Number.isFinite(Date.parse(trimmed)) ? trimmed : null;
  }
  const seconds = finiteNumber(value);
  return seconds === null ? null : new Date(seconds * 1000).toISOString();
}

function clampPct(value: unknown): number | null {
  const n = finiteNumber(value);
  return n === null ? null : Math.min(100, Math.max(0, n));
}

function parsePace(value: unknown): Pace | undefined {
  if (!isRecord(value)) return undefined;
  const pace: Pace = {};
  const expected = finiteNumber(value.expectedUsedPercent);
  if (expected !== null) pace.expectedUsedPct = expected;
  if (typeof value.willLastToReset === "boolean") pace.willLastToReset = value.willLastToReset;
  // Only an absolute time is accepted; etaSeconds is relative to an unknown instant and is never converted.
  const projected = isoOrNull(typeof value.projectedExhaustionAt === "string" ? value.projectedExhaustionAt : null);
  if (projected) pace.projectedExhaustionAt = projected;
  const summary = nonEmptyString(value.summary);
  if (summary) pace.summary = sanitize(summary, 160);
  const stage = nonEmptyString(value.stage);
  if (stage) pace.stage = sanitize(stage, 40);
  return Object.keys(pace).length > 0 ? pace : undefined;
}

function sessionLabel(windowMinutes: number | null): string {
  if (windowMinutes === null || windowMinutes <= 0 || windowMinutes === 300) return "5h";
  return windowMinutes % 60 === 0 ? `${windowMinutes / 60}h` : `${windowMinutes}m`;
}

function parseWindows(row: JsonObject, usage: JsonObject): UsageWindow[] {
  const observedAt = isoOrNull(usage.updatedAt);
  const paceRoot = isRecord(row.pace) ? row.pace : {};
  const labels = isRecord(row.rateWindowLabels) ? row.rateWindowLabels : {};
  const windows: UsageWindow[] = [];
  for (const slot of ["primary", "secondary", "tertiary"] as const) {
    const raw = usage[slot];
    // null/absent = the limit does not apply to this account; present = applies (value may still be unknown).
    if (raw === null || raw === undefined) continue;
    const data = isRecord(raw) ? raw : {};
    const windowMinutes = finiteNumber(data.windowMinutes);
    let window: UsageWindow;
    if (slot === "primary") {
      window = {
        id: "session",
        kind: "session",
        label: sessionLabel(windowMinutes),
        usedPct: null,
        resetsAt: null,
        observedAt,
      };
    } else if (slot === "secondary") {
      window = { id: "weekly", kind: "weekly", label: "Weekly", usedPct: null, resetsAt: null, observedAt };
    } else {
      const label = sanitize(nonEmptyString(labels.tertiary) ?? "Scoped", 40) || "Scoped";
      window = {
        id: `scoped:${label.toLowerCase()}`,
        kind: "scoped",
        label,
        usedPct: null,
        resetsAt: null,
        observedAt,
      };
    }
    window.usedPct = clampPct(data.usedPercent);
    window.resetsAt = isoOrNull(data.resetsAt);
    if (windowMinutes !== null && windowMinutes > 0) window.windowMinutes = windowMinutes;
    const pace = parsePace(paceRoot[slot]);
    if (pace) window.pace = pace;
    windows.push(window);
  }
  return windows;
}

function parseResetCredits(usage: JsonObject): Account["resetCredits"] {
  const credits = usage.codexResetCredits;
  if (!isRecord(credits)) return undefined;
  const available = finiteNumber(credits.availableCount);
  if (available === null) return undefined;
  return { available, observedAt: isoOrNull(credits.updatedAt) };
}

interface RowInfo {
  row: JsonObject;
  usage: JsonObject | null;
  email: string | null;
  suffix: string | null;
  label: string;
  managed: ManagedCodexAccount | null;
}

function rowInfo(row: JsonObject, managed: ManagedCodexAccount[]): RowInfo {
  const usage = isRecord(row.usage) ? row.usage : null;
  const identity = usage && isRecord(usage.identity) ? usage.identity : null;
  const accountLabel = nonEmptyString(row.account) ? sanitize(row.account, 160) : null;
  const { head, suffix } = splitAccountLabel(accountLabel);
  const rawEmail =
    nonEmptyString(usage?.accountEmail) ??
    nonEmptyString(identity?.accountEmail) ??
    (head && head.includes("@") ? head : null);
  const email = rawEmail ? sanitize(rawEmail, 160) || null : null;
  return {
    row,
    usage,
    email,
    suffix,
    label: accountLabel || email || "Codex account",
    managed: matchManaged(email, suffix, managed),
  };
}

/**
 * Index of the row that is the live system account; null when it cannot be determined unambiguously.
 * A managed row qualifies only when the live workspace id matches the managed entry (legacy entries
 * without ids match by email); an unmanaged row qualifies by email. An id-confirmed match wins.
 */
function findLiveRow(infos: RowInfo[], live: LiveIdentity | null): number | null {
  const liveEmail = live?.email?.toLowerCase();
  if (!live || !liveEmail) return null;
  const liveId = live.accountId?.toLowerCase() ?? null;
  const strong: number[] = [];
  const weak: number[] = [];
  infos.forEach((info, index) => {
    if (info.email?.toLowerCase() !== liveEmail) return;
    const m = info.managed;
    if (!m) weak.push(index);
    else if (m.workspaceAccountID === null && m.providerAccountID === null) weak.push(index);
    else if (liveId !== null && (m.workspaceAccountID === liveId || m.providerAccountID === liveId)) strong.push(index);
  });
  if (strong.length === 1) return strong[0];
  if (strong.length === 0 && weak.length === 1) return weak[0];
  return null;
}

/** Normalizes `codexbar usage --provider codex --all-accounts --json` output. Throws on a non-array or empty result. */
export function normalizeCodexbarRows(data: unknown, ctx: NormalizeContext): Account[] {
  if (!Array.isArray(data)) throw new Error("codexbar returned unexpected JSON (expected a list of accounts)");
  const rows = data.filter(
    (row): row is JsonObject => isRecord(row) && (row.provider === undefined || row.provider === "codex"),
  );
  if (rows.length === 0) throw new Error("codexbar returned no Codex accounts");

  const infos = rows.map((row) => rowInfo(row, ctx.managed));
  const liveIndex = findLiveRow(infos, ctx.live);
  const liveLabel = labelFor(ctx.workspaceLabels, ctx.live?.accountId ?? null);

  const accounts = infos.map((info, index): Account => {
    const { row, usage, managed } = info;
    const isLive = liveIndex === index;
    const active: Account["active"] = liveIndex === null ? "unknown" : isLive;
    // Managed rows take their stored label so the key survives switching; only an unmanaged live row uses the live cache.
    const workspaceLabel = info.suffix ?? (managed ? managed.workspaceLabel : isLive ? liveLabel : null);
    const identity = usage && isRecord(usage.identity) ? usage.identity : null;
    const organization = nonEmptyString(usage?.accountOrganization) ?? nonEmptyString(identity?.accountOrganization);
    const plan = nonEmptyString(usage?.loginMethod) ?? nonEmptyString(identity?.loginMethod);

    const windows = usage ? parseWindows(row, usage) : [];
    let status: AccountStatus = "ok";
    let statusDetail: string | undefined;
    const error = row.error;
    if (error !== undefined && error !== null) {
      status = "error";
      const message = isRecord(error) ? error.message : error;
      statusDetail = sanitize(message) || "CodexBar reported an error for this account";
    } else if (!usage) {
      status = "unavailable";
      statusDetail = "CodexBar returned no usage for this account";
    } else if (windows.length === 0) {
      status = "unavailable";
      statusDetail = "CodexBar reported no usage limits for this account";
    }

    let switchTarget: SwitchTarget | undefined;
    if (managed) switchTarget = { kind: "codex-managed", managedId: managed.id, homePath: managed.managedHomePath };
    else if (isLive) switchTarget = { kind: "codex-live" };

    const account: Account = {
      provider: "codex",
      key: codexKey(info.email, workspaceLabel),
      label: info.label,
      email: info.email,
      plan: plan ? sanitize(plan, 60) : null,
      workspace: workspaceLabel ?? (organization ? sanitize(organization, 120) : null),
      active,
      status,
      windows,
    };
    if (statusDetail) account.statusDetail = statusDetail;
    if (status === "error" && windows.length > 0) account.lastGood = true;
    const resetCredits = usage ? parseResetCredits(usage) : undefined;
    if (resetCredits) account.resetCredits = resetCredits;
    if (switchTarget) account.switchTarget = switchTarget;
    return account;
  });

  // Two rows with one key cannot be told apart by a switch request: neither gets a target.
  const counts = new Map<string, number>();
  for (const account of accounts) counts.set(account.key, (counts.get(account.key) ?? 0) + 1);
  for (const account of accounts) {
    if ((counts.get(account.key) ?? 0) > 1) delete account.switchTarget;
  }
  // A direct switch must preserve the live login in its CodexBar home first; mark the refusal up front so the
  // UI hands these rows to CodexBar and suggestions skip them.
  const blocked = liveSwitchBlock(ctx.live, ctx.managed);
  if (blocked) {
    for (const account of accounts) {
      if (account.switchTarget?.kind === "codex-managed" && account.active !== true) account.switchBlocked = blocked;
    }
  }
  return accounts;
}

/**
 * Why a direct switch away from the live login is refused right now, or null. Mirrors the checks in
 * codexSwitch's prepare(): the live login must be a ChatGPT login saved in CodexBar under its email and
 * workspace id. An unreadable or identity-less login returns null (it may be mid-write; preflight explains).
 */
export function liveSwitchBlock(live: LiveIdentity | null, managed: ManagedCodexAccount[]): string | null {
  if (!live) return null;
  if (live.authMode !== "chatgpt") return BLOCKED_LIVE_NOT_CHATGPT;
  if (!live.email || !live.accountId) return null;
  const email = live.email.toLowerCase();
  const accountId = live.accountId.toLowerCase();
  const saved = managed.some((m) => m.email === email && effectiveWorkspaceId(m) === accountId);
  return saved ? null : BLOCKED_LIVE_UNMANAGED;
}

export type CodexSwitchRoute = { kind: "direct" } | { kind: "handoff"; reason: string | null };

/**
 * How a Codex switch request is carried out. A hand-off only opens CodexBar, so it runs without the provider
 * lock or the switch flow. `live` and `managed` are read from disk right before the switch, so a stale
 * snapshot flag cannot block a switch that became possible (or allow one that no longer is).
 */
export function codexSwitchRoute(input: {
  mode: "direct" | "codexbar";
  target: Account | undefined;
  expectedEmail: string | null;
  live: LiveIdentity | null;
  managed: ManagedCodexAccount[];
}): CodexSwitchRoute {
  if (input.mode === "codexbar") return { kind: "handoff", reason: null };
  const target = input.target;
  // Not in the snapshot at all: the switch flow reports it (nothing to hand to CodexBar by name).
  if (!target) return { kind: "direct" };
  const switchTarget = target.switchTarget;
  if (switchTarget?.kind === "codex-managed") {
    const blocked = liveSwitchBlock(input.live, input.managed);
    return blocked ? { kind: "handoff", reason: blocked } : { kind: "direct" };
  }
  if (switchTarget?.kind === "codex-live") {
    // Only the live row carries this target: still live means a no-op, which the flow records.
    const expected = input.expectedEmail?.trim().toLowerCase();
    if (expected && input.live?.email === expected) return { kind: "direct" };
  }
  return { kind: "handoff", reason: CODEX_TARGET_NOT_SAVED };
}

// ---------------------------------------------------------------------------
// Fetch

export async function fetchCodex(cfg: { codexbarPath: string; paths?: CodexPaths }): Promise<ProviderFetch> {
  const paths = cfg.paths ?? defaultCodexPaths();
  const executable = resolveExecutable(cfg.codexbarPath);
  const result = await runQuery(executable, CODEXBAR_USAGE_ARGS, CODEXBAR_TIMEOUT_MS);
  let data: unknown;
  try {
    // Parsed even on a nonzero exit: CodexBar exits nonzero when any single account fails.
    data = parseJsonOutput(result.stdout);
  } catch (error) {
    const reason = result.timedOut
      ? `did not answer within ${CODEXBAR_TIMEOUT_MS / 1000} s`
      : result.exitCode === 0
        ? "returned unreadable output"
        : `failed (exit ${result.exitCode ?? result.signal ?? "unknown"})`;
    const detail = sanitize(result.stderr) || sanitize((error as Error).message);
    throw new Error(`codexbar ${reason}${detail ? `: ${detail}` : ""}`);
  }

  const store = readManagedStore(paths);
  const live = readLiveIdentity(paths);
  const accounts = normalizeCodexbarRows(data, {
    managed: store.accounts,
    workspaceLabels: readWorkspaceLabels(paths),
    live,
  });

  const notices: string[] = [];
  if (store.notice) notices.push(store.notice);
  const activeRow = accounts.find((account) => account.active === true);
  if (!live) notices.push(NOTICE_LIVE_UNREADABLE);
  else if (!activeRow) notices.push(NOTICE_LIVE_UNMATCHED);
  else if (!store.notice && activeRow.switchTarget?.kind !== "codex-managed") notices.push(NOTICE_LIVE_UNMANAGED);
  return { provider: "codex", source: "codexbar", accounts, notices };
}
