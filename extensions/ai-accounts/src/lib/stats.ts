import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import {
  defaultCodexPaths,
  LiveIdentity,
  ManagedCodexAccount,
  readLiveIdentity,
  readManagedAccounts,
  readWorkspaceLabels,
} from "./codex";
import { parseJsonOutput, resolveExecutable, runQuery, RunResult, sanitize } from "./exec";
import { atomicWriteFile } from "./store";

export type StatsProvider = "claude" | "codex";

/** Counts only. Credential tokens and conversation content never enter statistics. */
export interface UsageTokens {
  input: number;
  cachedInput: number;
  output: number;
  total: number;
  reasoning?: number;
  cacheWrite?: number;
}

export interface ModelUsage {
  provider: StatsProvider;
  modelName: string;
  totalTokens: number;
  cost: number | null;
}

export interface DailyUsage {
  date: string;
  totalTokens: number;
  totalCost: number | null;
  models: ModelUsage[];
}

export interface ProviderStats {
  provider: StatsProvider;
  tokens: UsageTokens;
  totalCost: number | null;
  daily: DailyUsage[];
  last30DaysTokens: number | null;
  last30DaysCostUSD: number | null;
  historyCoverageIsEstablished: boolean;
  updatedAt: string | null;
}

export interface RolloutUsage {
  accountId: string | null;
  startedAt: string | null;
  forked: boolean;
  own: UsageTokens;
}

export interface UsageIndexEntry extends RolloutUsage {
  size: number;
  mtimeMs: number;
  deleted?: boolean;
}

export const INDEX_VERSION = 2;

export interface CodexUsageIndex {
  version: typeof INDEX_VERSION;
  entries: Record<string, UsageIndexEntry>;
  updatedAt: string;
}

export interface CodexStats extends ProviderStats {
  provider: "codex";
  sessions: number;
  forkedSessions: number;
  attributedSessions: number;
  firstAttributedSession: string | null;
  firstSession: string | null;
  lastSession: string | null;
}

export interface AccountContext {
  managed: ManagedCodexAccount[];
  workspaceLabels: Record<string, string>;
  live: LiveIdentity | null;
}

export interface AccountUsage {
  accountId: string | null;
  tokens: UsageTokens;
  label: string;
  sessions: number;
  firstSession: string | null;
  lastSession: string | null;
}

export interface StatsSnapshot {
  version: 2;
  providers: { claude?: ProviderStats; codex?: CodexStats };
  accounts: AccountUsage[];
  errors: Partial<Record<StatsProvider | "index", string>>;
  updatedAt: string | null;
}

const INDEX_FILE = "codex-usage-index.json";
const SNAPSHOT_FILE = "usage-statistics.json";
export const COST_TIMEOUT_MS = 300_000;
const MAX_LINE_BYTES = 2 * 1024 * 1024;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? sanitize(value) : null;
}

function timestamp(value: unknown): string | null {
  const text = textOrNull(value);
  return text && Number.isFinite(Date.parse(text)) ? new Date(text).toISOString() : null;
}

function day(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = timestamp(value);
  return date?.slice(0, 10) === value ? value : null;
}

function zeroTokens(): UsageTokens {
  return { input: 0, cachedInput: 0, output: 0, reasoning: 0, total: 0 };
}

export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  const unit = abs >= 1e12 ? [1e12, "T"] : abs >= 1e9 ? [1e9, "B"] : abs >= 1e6 ? [1e6, "M"] : [1e3, "K"];
  if (abs < 1e3) return String(Math.round(value));
  const scaled = value / (unit[0] as number);
  const decimals = Math.abs(scaled) < 10 ? 1 : 2;
  return `${Number(scaled.toFixed(decimals))}${unit[1]}`;
}

export function money(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${sign}$${Number((abs / 1e9).toFixed(1))}b`;
  if (abs >= 1e6) return `${sign}$${Number((abs / 1e6).toFixed(1))}m`;
  if (abs >= 1e3) return `${sign}$${Number((abs / 1e3).toFixed(1))}k`;
  return `${sign}$${Number(abs.toFixed(2))}`;
}

/** Select a provider and retain only usage counts, prices, dates, and model names. */
export function parseCostOutput(stdout: string, provider: StatsProvider): ProviderStats {
  let raw: unknown;
  try {
    raw = parseJsonOutput(stdout);
  } catch {
    throw new Error("Cost scan returned empty or invalid JSON");
  }
  const candidates = Array.isArray(raw) ? raw : [raw];
  const row = candidates.find((item) => record(item) && item.provider === provider);
  if (!record(row) || !record(row.totals) || row.error != null) {
    throw new Error(`Cost scan returned no ${provider} usage totals`);
  }
  const totals = row.totals;
  const tokens: UsageTokens = {
    input: count(totals.inputTokens),
    cachedInput: count(totals.cacheReadTokens),
    output: count(totals.outputTokens),
    total: count(totals.totalTokens),
  };
  if (optionalNumber(totals.reasoningTokens) !== null) tokens.reasoning = count(totals.reasoningTokens);
  if (optionalNumber(totals.cacheCreationTokens) !== null) tokens.cacheWrite = count(totals.cacheCreationTokens);
  const daily: DailyUsage[] = [];
  for (const item of Array.isArray(row.daily) ? row.daily : []) {
    if (!record(item)) continue;
    const date = day(item.date);
    if (!date) continue;
    const models: ModelUsage[] = [];
    for (const model of Array.isArray(item.modelBreakdowns) ? item.modelBreakdowns : []) {
      if (!record(model)) continue;
      const modelName = textOrNull(model.modelName);
      if (modelName) {
        models.push({ provider, modelName, totalTokens: count(model.totalTokens), cost: optionalNumber(model.cost) });
      }
    }
    daily.push({ date, totalTokens: count(item.totalTokens), totalCost: optionalNumber(item.totalCost), models });
  }
  daily.sort((a, b) => a.date.localeCompare(b.date));
  return {
    provider,
    tokens,
    totalCost: optionalNumber(totals.totalCost),
    daily,
    last30DaysTokens: optionalNumber(row.last30DaysTokens),
    last30DaysCostUSD: optionalNumber(row.last30DaysCostUSD),
    historyCoverageIsEstablished: row.historyCoverageIsEstablished === true,
    updatedAt: timestamp(row.updatedAt),
  };
}

function addTokens(a: UsageTokens, b: UsageTokens): void {
  a.input += b.input;
  a.cachedInput += b.cachedInput;
  a.output += b.output;
  a.total += b.total;
  if (b.reasoning !== undefined) a.reasoning = (a.reasoning ?? 0) + b.reasoning;
  if (b.cacheWrite !== undefined) a.cacheWrite = (a.cacheWrite ?? 0) + b.cacheWrite;
}

function knownSum(values: (number | null)[]): number | null {
  return values.length && values.every((value) => value !== null)
    ? (values as number[]).reduce((a, b) => a + b, 0)
    : null;
}

export function lifetimeSummary(providers: ProviderStats[]) {
  const tokens: UsageTokens = { input: 0, cachedInput: 0, output: 0, total: 0 };
  const activeDays = new Set<string>();
  const sessionDays = new Set<string>();
  for (const provider of providers) {
    addTokens(tokens, provider.tokens);
    for (const daily of provider.daily) {
      if (daily.totalTokens > 0) activeDays.add(daily.date);
      if (provider.provider === "codex" || daily.totalTokens > 0) sessionDays.add(daily.date);
    }
  }
  const dates = [...sessionDays].sort();
  const claude = providers.find((provider) => provider.provider === "claude");
  return {
    tokens,
    totalCost: claude?.totalCost ?? null,
    firstDay: dates[0] ?? null,
    lastDay: dates.at(-1) ?? null,
    daysActive: activeDays.size,
    last30DaysTokens: knownSum(providers.map((provider) => provider.last30DaysTokens)),
    last30DaysCostUSD: claude?.last30DaysCostUSD ?? null,
    historyCoverageIsEstablished:
      providers.length > 0 && providers.every((provider) => provider.historyCoverageIsEstablished),
  };
}

export function aggregateModels(providers: ProviderStats[], limit = 8): ModelUsage[] {
  const models = new Map<string, ModelUsage>();
  for (const provider of providers) {
    // A session-level model name cannot establish per-model token totals.
    if (provider.provider !== "claude") continue;
    for (const daily of provider.daily) {
      for (const model of daily.models) {
        const key = `${model.provider}:${model.modelName}`;
        const existing = models.get(key);
        if (existing) {
          existing.totalTokens += model.totalTokens;
          existing.cost = knownSum([existing.cost, model.cost]);
        } else models.set(key, { ...model });
      }
    }
  }
  return [...models.values()]
    .sort((a, b) => b.totalTokens - a.totalTokens || a.modelName.localeCompare(b.modelName))
    .slice(0, limit);
}

export function parseRolloutHead(text: string): Omit<RolloutUsage, "own"> {
  for (const line of text.split("\n")) {
    if (!line.includes('"session_meta"')) continue;
    try {
      const row: unknown = JSON.parse(line);
      if (!record(row) || row.type !== "session_meta" || !record(row.payload)) continue;
      return {
        accountId: textOrNull(row.payload.creator_account_id)?.toLowerCase() ?? null,
        startedAt: timestamp(row.payload.timestamp),
        forked: Boolean(textOrNull(row.payload.forked_from_id) || textOrNull(row.payload.parent_session_id)),
      };
    } catch {
      // Incomplete lines are retried by the bounded file reader.
    }
  }
  return { accountId: null, startedAt: null, forked: false };
}

function tokenCountInfo(line: string): Record<string, unknown> | null {
  if (!line.includes('"token_count"')) return null;
  try {
    const row: unknown = JSON.parse(line);
    if (!record(row) || row.type !== "event_msg" || !record(row.payload) || row.payload.type !== "token_count")
      return null;
    return record(row.payload.info) ? row.payload.info : null;
  } catch {
    return null;
  }
}

function rolloutTokens(usage: unknown): UsageTokens | null {
  if (!record(usage) || optionalNumber(usage.total_tokens) === null) return null;
  const tokens: UsageTokens = {
    input: count(usage.input_tokens),
    cachedInput: count(usage.cached_input_tokens),
    output: count(usage.output_tokens),
    reasoning: count(usage.reasoning_output_tokens),
    total: count(usage.total_tokens),
  };
  if (optionalNumber(usage.cache_write_input_tokens) !== null)
    tokens.cacheWrite = count(usage.cache_write_input_tokens);
  return tokens;
}

export function parseRolloutTail(text: string): UsageTokens | null {
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const info = tokenCountInfo(lines[i]);
    const tokens = info && rolloutTokens(info.total_token_usage);
    if (tokens) return tokens;
  }
  return null;
}

function ownTokens(final: UsageTokens, first: UsageTokens, last: UsageTokens): UsageTokens {
  const own = zeroTokens();
  for (const component of ["input", "cachedInput", "output", "reasoning", "total", "cacheWrite"] as const) {
    if (component !== "cacheWrite" || final.cacheWrite !== undefined || first.cacheWrite !== undefined) {
      own[component] = Math.max(0, (final[component] ?? 0) - ((first[component] ?? 0) - (last[component] ?? 0)));
    }
  }
  return own;
}

/** Find the first count forwards and the final count backwards, retaining bounded chunks only. */
export async function readRolloutUsage(
  file: string,
  options: { headBytes?: number; tailBytes?: number } = {},
): Promise<RolloutUsage> {
  const handle = await fsp.open(file, "r");
  try {
    const { size } = await handle.stat();
    const headBytes = Math.max(1, Math.min(options.headBytes ?? 64 * 1024, MAX_LINE_BYTES));
    const tailBytes = Math.max(1, Math.min(options.tailBytes ?? 256 * 1024, MAX_LINE_BYTES));
    const buffer = Buffer.allocUnsafe(Math.max(headBytes, tailBytes));
    let headOffset = 0;
    let metadata: Omit<RolloutUsage, "own"> = { accountId: null, startedAt: null, forked: false };
    let metadataFound = false;
    const headState: { first: { total: UsageTokens; last: UsageTokens } | null } = { first: null };
    let headCarry = "";
    let droppingHeadLine = false;
    const decoder = new StringDecoder("utf8");
    const inspectLine = (line: string) => {
      if (!metadataFound && line.includes('"session_meta"')) {
        metadata = parseRolloutHead(line);
        metadataFound = Boolean(metadata.startedAt || metadata.accountId || metadata.forked);
      }
      const info = tokenCountInfo(line);
      const total = info && rolloutTokens(info.total_token_usage);
      if (!total) return;
      const last = rolloutTokens(info?.last_token_usage);
      if (!last) throw new Error("First token count lacks per-request usage");
      headState.first = { total, last };
    };
    while (headOffset < size && !headState.first) {
      const length = Math.min(headBytes, size - headOffset);
      const { bytesRead } = await handle.read(buffer, 0, length, headOffset);
      if (!bytesRead) break;
      headOffset += bytesRead;
      const fragments = decoder.write(buffer.subarray(0, bytesRead)).split("\n");
      for (let i = 0; i < fragments.length; i++) {
        const complete = i < fragments.length - 1;
        if (droppingHeadLine) {
          if (complete) droppingHeadLine = false;
          continue;
        }
        if (headCarry.length + fragments[i].length > MAX_LINE_BYTES) {
          headCarry = "";
          droppingHeadLine = !complete;
          continue;
        }
        headCarry += fragments[i];
        if (complete) {
          inspectLine(headCarry);
          headCarry = "";
          if (headState.first) break;
        }
      }
    }
    if (!headState.first && !droppingHeadLine) inspectLine(headCarry + decoder.end());
    headCarry = "";
    const first = headState.first;
    if (!first) return { ...metadata, own: zeroTokens() };
    let end = size;
    let carry = "";
    let droppingLongLine = false;
    while (end > 0) {
      const start = Math.max(0, end - tailBytes);
      const { bytesRead } = await handle.read(buffer, 0, end - start, start);
      if (!bytesRead) break;
      const lines = (buffer.subarray(0, bytesRead).toString("utf8") + carry).split("\n");
      carry = "";
      if (droppingLongLine) {
        lines.pop();
        if (lines.length) droppingLongLine = false;
      }
      if (start > 0) carry = lines.shift() ?? "";
      const tokens = parseRolloutTail(lines.join("\n"));
      if (tokens) return { ...metadata, own: ownTokens(tokens, first.total, first.last) };
      if (carry.length > MAX_LINE_BYTES) {
        carry = "";
        droppingLongLine = true;
      }
      end = start;
    }
    throw new Error("Final token count could not be read");
  } finally {
    await handle.close();
  }
}

function validTokens(value: unknown): value is UsageTokens {
  return (
    record(value) &&
    ["input", "cachedInput", "output", "total"].every((key) => optionalNumber(value[key]) !== null) &&
    ["reasoning", "cacheWrite"].every((key) => value[key] === undefined || optionalNumber(value[key]) !== null)
  );
}

export function readCodexIndex(stateDir: string): CodexUsageIndex {
  const empty: CodexUsageIndex = { version: INDEX_VERSION, entries: {}, updatedAt: "" };
  try {
    const raw: unknown = JSON.parse(fs.readFileSync(path.join(stateDir, INDEX_FILE), "utf8"));
    if (!record(raw) || raw.version !== INDEX_VERSION || !record(raw.entries)) return empty;
    for (const entry of Object.values(raw.entries)) {
      if (
        !record(entry) ||
        !validTokens(entry.own) ||
        optionalNumber(entry.own.reasoning) === null ||
        typeof entry.forked !== "boolean" ||
        (entry.deleted !== undefined && typeof entry.deleted !== "boolean") ||
        optionalNumber(entry.size) === null ||
        optionalNumber(entry.mtimeMs) === null
      )
        return empty;
      if (entry.accountId !== null && typeof entry.accountId !== "string") return empty;
      if (entry.startedAt !== null && timestamp(entry.startedAt) === null) return empty;
    }
    return raw as unknown as CodexUsageIndex;
  } catch {
    return empty;
  }
}

async function* rolloutFiles(dir: string): AsyncGenerator<string> {
  const handle = await fsp.opendir(dir);
  for await (const entry of handle) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* rolloutFiles(file);
    else if (entry.isFile() && entry.name.startsWith("rollout-") && entry.name.endsWith(".jsonl")) yield file;
  }
}

export async function refreshCodexIndex(options: {
  sessionsDir: string;
  stateDir: string;
  readRollout?: (file: string) => Promise<RolloutUsage>;
}) {
  const index = readCodexIndex(options.stateDir);
  const seen = new Set<string>();
  let filesRead = 0;
  let filesUnchanged = 0;
  let failedFiles = 0;
  // Traverse completely before marking deletions or saving.
  for await (const file of rolloutFiles(path.resolve(options.sessionsDir))) {
    seen.add(file);
    try {
      const stat = await fsp.stat(file);
      const previous = index.entries[file];
      if (previous && !previous.deleted && previous.size === stat.size && previous.mtimeMs === stat.mtimeMs) {
        filesUnchanged++;
        continue;
      }
      const usage = await (options.readRollout ?? readRolloutUsage)(file);
      index.entries[file] = { size: stat.size, mtimeMs: stat.mtimeMs, ...usage };
      filesRead++;
    } catch {
      failedFiles++;
      // Keep prior counts, with prior size/mtime, so the failed read is retried next time.
    }
  }
  let filesDeleted = 0;
  for (const file of Object.keys(index.entries)) {
    if (!seen.has(file) && !index.entries[file].deleted) {
      index.entries[file].deleted = true;
      filesDeleted++;
    }
  }
  index.updatedAt = new Date().toISOString();
  await fsp.mkdir(options.stateDir, { recursive: true, mode: 0o700 });
  atomicWriteFile(path.join(options.stateDir, INDEX_FILE), JSON.stringify(index));
  return { index, filesRead, filesUnchanged, filesDeleted, failedFiles };
}

export function accountLabel(accountId: string | null, context: AccountContext): string {
  if (!accountId) return "Account not recorded";
  const id = accountId.trim().toLowerCase();
  const managed = context.managed.find((account) =>
    [account.workspaceAccountID, account.providerAccountID].some((value) => value?.toLowerCase() === id),
  );
  const workspace = managed?.workspaceLabel || context.workspaceLabels[id];
  const email = managed?.email || (context.live?.accountId?.toLowerCase() === id ? context.live.email : null);
  if (email) return sanitize(workspace ? `${email} · ${workspace}` : email);
  return sanitize(workspace || `Account ${accountId.slice(0, 8)}`);
}

export function aggregateAccounts(index: CodexUsageIndex, context: AccountContext): AccountUsage[] {
  const accounts = new Map<string, AccountUsage>();
  for (const entry of Object.values(index.entries)) {
    const key = entry.accountId ?? "";
    let account = accounts.get(key);
    if (!account) {
      account = {
        accountId: entry.accountId,
        label: accountLabel(entry.accountId, context),
        sessions: 0,
        tokens: { input: 0, cachedInput: 0, output: 0, total: 0 },
        firstSession: null,
        lastSession: null,
      };
      accounts.set(key, account);
    }
    account.sessions++;
    addTokens(account.tokens, entry.own);
    if (entry.startedAt) {
      if (!account.firstSession || entry.startedAt < account.firstSession) account.firstSession = entry.startedAt;
      if (!account.lastSession || entry.startedAt > account.lastSession) account.lastSession = entry.startedAt;
    }
  }
  return [...accounts.values()].sort((a, b) => b.tokens.total - a.tokens.total || a.label.localeCompare(b.label));
}

/** Saved entries include deleted logs. Each path contributes once to lifetime usage. */
export function aggregateCodexIndex(index: CodexUsageIndex, now = new Date()): CodexStats {
  const tokens = zeroTokens();
  const days = new Map<string, DailyUsage>();
  const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  let sessions = 0;
  let forkedSessions = 0;
  let attributedSessions = 0;
  let firstAttributedSession: string | null = null;
  let firstSession: string | null = null;
  let lastSession: string | null = null;
  let last30DaysTokens = 0;
  for (const entry of Object.values(index.entries)) {
    sessions++;
    addTokens(tokens, entry.own);
    if (entry.forked) forkedSessions++;
    if (entry.accountId) {
      attributedSessions++;
      if (entry.startedAt && (!firstAttributedSession || entry.startedAt < firstAttributedSession))
        firstAttributedSession = entry.startedAt;
    }
    if (!entry.startedAt) continue;
    if (!firstSession || entry.startedAt < firstSession) firstSession = entry.startedAt;
    if (!lastSession || entry.startedAt > lastSession) lastSession = entry.startedAt;
    const startedAt = Date.parse(entry.startedAt);
    if (startedAt >= cutoff && startedAt <= now.getTime()) last30DaysTokens += entry.own.total;
    const date = entry.startedAt.slice(0, 10);
    const daily = days.get(date) ?? { date, totalTokens: 0, totalCost: null, models: [] };
    daily.totalTokens += entry.own.total;
    days.set(date, daily);
  }
  return {
    provider: "codex",
    tokens,
    totalCost: null,
    daily: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    last30DaysTokens,
    last30DaysCostUSD: null,
    historyCoverageIsEstablished: true,
    updatedAt: timestamp(index.updatedAt),
    sessions,
    forkedSessions,
    attributedSessions,
    firstAttributedSession,
    firstSession,
    lastSession,
  };
}

function emptySnapshot(): StatsSnapshot {
  return { version: 2, providers: {}, accounts: [], errors: {}, updatedAt: null };
}

export function readStatsSnapshot(stateDir: string): StatsSnapshot {
  try {
    const raw: unknown = JSON.parse(fs.readFileSync(path.join(stateDir, SNAPSHOT_FILE), "utf8"));
    if (
      !record(raw) ||
      raw.version !== 2 ||
      !record(raw.providers) ||
      !Array.isArray(raw.accounts) ||
      !record(raw.errors)
    )
      return emptySnapshot();
    for (const provider of Object.values(raw.providers)) {
      if (!record(provider) || !validTokens(provider.tokens) || !Array.isArray(provider.daily)) return emptySnapshot();
    }
    if (raw.providers.codex !== undefined) {
      const codex = raw.providers.codex;
      if (
        !record(codex) ||
        ["sessions", "forkedSessions", "attributedSessions"].some((key) => optionalNumber(codex[key]) === null) ||
        ["firstSession", "lastSession", "firstAttributedSession"].some(
          (key) => codex[key] !== null && timestamp(codex[key]) === null,
        ) ||
        codex.totalCost !== null ||
        codex.last30DaysCostUSD !== null
      )
        return emptySnapshot();
    }
    for (const account of raw.accounts) if (!record(account) || !validTokens(account.tokens)) return emptySnapshot();
    return raw as unknown as StatsSnapshot;
  } catch {
    return emptySnapshot();
  }
}

export function costArgs(provider: StatsProvider, rescan = false): string[] {
  return ["cost", "--provider", provider, "--period", "all", "--format", "json", ...(rescan ? ["--refresh"] : [])];
}

interface StatsRefresh {
  promise: Promise<StatsSnapshot>;
  listeners: Set<(snapshot: StatsSnapshot) => void>;
  latest: StatsSnapshot;
  rescan: boolean;
  queuedRescan?: Promise<StatsSnapshot>;
}

const refreshes = new Map<string, StatsRefresh>();

function publish(refresh: StatsRefresh, snapshot: StatsSnapshot): void {
  refresh.latest = { ...snapshot, providers: { ...snapshot.providers }, errors: { ...snapshot.errors } };
  for (const listener of refresh.listeners) {
    try {
      listener(refresh.latest);
    } catch {
      // A closed view must not interrupt indexing or another view's updates.
    }
  }
}

export function refreshStats(options: {
  stateDir: string;
  codexbarPath: string;
  rescan?: boolean;
  onUpdate?: (snapshot: StatsSnapshot) => void;
  /** Dependency overrides support synthetic tests without reading local identities/logs. */
  sessionsDir?: string;
  accountContext?: AccountContext;
  query?: (file: string, args: readonly string[], timeoutMs: number) => Promise<RunResult>;
}): Promise<StatsSnapshot> {
  const key = path.resolve(options.stateDir);
  const existing = refreshes.get(key);
  if (existing) {
    if (options.onUpdate) {
      existing.listeners.add(options.onUpdate);
      publish(existing, existing.latest);
    }
    if (options.rescan && !existing.rescan) {
      // Serialize one requested full rescan after the current cached scan.
      existing.queuedRescan ??= existing.promise.then(() =>
        refreshStats({ ...options, rescan: true, onUpdate: (snapshot) => publish(existing, snapshot) }),
      );
      return existing.queuedRescan;
    }
    return existing.promise;
  }
  const refresh: StatsRefresh = {
    promise: Promise.resolve(emptySnapshot()),
    listeners: new Set(options.onUpdate ? [options.onUpdate] : []),
    latest: readStatsSnapshot(options.stateDir),
    rescan: options.rescan === true,
  };
  refreshes.set(key, refresh);
  const task = (async () => {
    let snapshot = refresh.latest;
    const emit = () => publish(refresh, snapshot);
    const paths = defaultCodexPaths();
    const cachedIndex = readCodexIndex(options.stateDir);
    if (Object.keys(cachedIndex.entries).length) snapshot.providers.codex = aggregateCodexIndex(cachedIndex);
    const costs = (async () => {
      try {
        const result = await (options.query ?? runQuery)(
          resolveExecutable(options.codexbarPath),
          costArgs("claude", options.rescan),
          COST_TIMEOUT_MS,
        );
        if (result.timedOut) throw new Error("timeout");
        if (result.exitCode !== 0 || result.truncated) throw new Error("scan failed");
        snapshot.providers.claude = parseCostOutput(result.stdout, "claude");
        delete snapshot.errors.claude;
      } catch {
        snapshot.errors.claude = "Claude Code cost scan failed. Showing saved statistics. Refresh or rescan to retry.";
      }
      emit();
    })();
    const accounts = (async () => {
      try {
        const result = await refreshCodexIndex({
          sessionsDir: options.sessionsDir ?? path.join(paths.codexHome, "sessions"),
          stateDir: options.stateDir,
        });
        snapshot.providers.codex = aggregateCodexIndex(result.index);
        snapshot.providers.codex.historyCoverageIsEstablished = result.failedFiles === 0;
        const context = options.accountContext ?? {
          managed: readManagedAccounts(paths),
          workspaceLabels: readWorkspaceLabels(paths),
          live: readLiveIdentity(paths),
        };
        snapshot.accounts = aggregateAccounts(result.index, context);
        if (result.failedFiles) {
          snapshot.errors.index = `${result.failedFiles} session files could not be read. Previously indexed counts were retained; refresh to retry.`;
          snapshot.errors.codex = snapshot.errors.index;
        } else {
          delete snapshot.errors.index;
          delete snapshot.errors.codex;
        }
      } catch {
        snapshot.errors.index = "Codex session index could not be refreshed. Showing saved statistics.";
        snapshot.errors.codex = snapshot.errors.index;
        if (snapshot.providers.codex) snapshot.providers.codex.historyCoverageIsEstablished = false;
      }
      emit();
    })();
    await Promise.allSettled([costs, accounts]);
    snapshot = { ...snapshot, updatedAt: new Date().toISOString() };
    try {
      await fsp.mkdir(options.stateDir, { recursive: true, mode: 0o700 });
      atomicWriteFile(path.join(options.stateDir, SNAPSHOT_FILE), JSON.stringify(snapshot));
    } catch {
      snapshot.errors.index = [snapshot.errors.index, "Statistics cache could not be saved."].filter(Boolean).join(" ");
    }
    emit();
    return snapshot;
  })();
  refresh.promise = task;
  const cleanup = () => {
    if (refreshes.get(key) === refresh) refreshes.delete(key);
  };
  void task.then(cleanup, cleanup);
  return task;
}
