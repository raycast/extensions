import { getPreferenceValues } from "@raycast/api";
import { ApiError, RateLimitError, getStatement, getTokenFingerprint, requireToken } from "../api/monobank";
import { StatementItemResponse } from "../api/types";
import {
  DEFAULT_STATEMENT_RETENTION_MONTHS,
  HISTORY_SYNC_MONTHS_UNLIMITED,
  STATEMENT_MAX_PERIOD,
  STATEMENT_PAGE_SIZE,
  STATEMENT_RATE_LIMIT,
  getStatementKey,
} from "../data/constants";
import { AccountOrJar } from "../types";
import { getLatestPeriodEnd, resolvePeriod, validatePeriod } from "../utils/statement";
import { toUserFacingError } from "./clientInfo";
import { toLocalIso } from "./format";
import { sleep } from "../utils/common";
import { reserveStatementSlot } from "./rateLimit";
import { readJson, writeJson } from "./storage";

/** Unix seconds, both ends included. */
export interface TimeRange {
  from: number;
  to: number;
}

/** A period to show. Without `to`, it runs until now. */
export interface StatementPeriod {
  from: number;
  to?: number;
}

/** The parameters of a statement request. Without `to`, monobank returns transactions until now. */
export type StatementRequest = StatementPeriod;

/**
 * Every transaction of one account known so far. Each response is merged in, and any period is shown by
 * filtering `items`. Items keep the API format, so changes to the domain types (e.g. new MCC data) apply to them too.
 */
export interface StoredStatement {
  /** Token fingerprint. A statement stored for another token reads as empty. */
  scope: string;
  /** Newest first, with unique ids. */
  items: StatementItemResponse[];
  /** Where `items` has every transaction. Sorted, without overlapping or adjacent ranges. */
  covered: TimeRange[];
  /** Unix milliseconds of the last request that ended now, or 0. */
  syncedAt: number;
  /**
   * Unix seconds. "Sync Statements" loads history only from here on, set when monobank rejected an older range
   * (e.g. one older than it keeps), so one account can't block the history of the others.
   */
  historyFrom?: number;
}

export type RequestMode = "auto" | "refresh" | "older";

/** The parts of `[from, to]` that `covered` doesn't include, newest first. */
export function getGaps(covered: TimeRange[], from: number, to: number): TimeRange[] {
  const gaps: TimeRange[] = [];
  let end = to;

  for (let i = covered.length - 1; i >= 0 && end >= from; i--) {
    const range = covered[i];
    if (range.from > end) continue;
    if (range.to < end) gaps.push({ from: Math.max(range.to + 1, from), to: end });
    end = range.from - 1;
  }

  if (end >= from) gaps.push({ from, to: end });
  return gaps;
}

/** The union of `covered` and `range`, with overlapping or adjacent ranges merged. */
export function addRange(covered: TimeRange[], range: TimeRange): TimeRange[] {
  if (range.from > range.to) return covered;

  const sorted = [...covered, range].sort((a, b) => a.from - b.from);
  const merged: TimeRange[] = [];

  for (const next of sorted) {
    const last = merged[merged.length - 1];
    if (last && next.from <= last.to + 1) {
      last.to = Math.max(last.to, next.to);
    } else {
      merged.push({ ...next });
    }
  }

  return merged;
}

/**
 * Merges a response into the stored statement. The response replaces the stored items in the range it covers,
 * so transactions that changed (e.g. a settled hold) are updated and ones monobank dropped (a cancelled hold)
 * are removed.
 */
export function mergeResponse(
  stored: StoredStatement,
  request: StatementRequest,
  page: StatementItemResponse[],
  fetchedAt: number,
): StoredStatement {
  const isFull = page.length >= STATEMENT_PAGE_SIZE;
  const to = request.to ?? Math.floor(fetchedAt / 1000);
  // A full page may stop before `request.from`, and in the middle of its oldest second.
  const from = isFull ? Math.min(...page.map((item) => item.time)) : request.from;

  const pageIds = new Set(page.map((item) => item.id));
  const kept = stored.items.filter((item) => {
    if (pageIds.has(item.id)) return false;
    if (item.time > to || item.time < from) return true;
    // Items at `from` that a full page lacks may be beyond its cut.
    return isFull && item.time === from;
  });

  return {
    scope: stored.scope,
    items: [...page, ...kept].sort((a, b) => b.time - a.time),
    covered: addRange(stored.covered, { from: isFull ? from + 1 : from, to }),
    syncedAt: request.to === undefined ? fetchedAt : stored.syncedAt,
    ...(stored.historyFrom !== undefined && { historyFrom: stored.historyFrom }),
  };
}

/** Months of transactions to keep, from the "Keep Statements For" preference, or `undefined` to keep all. */
export function getRetentionMonths(): number | undefined {
  const { statementRetention } = getPreferenceValues<Preferences>();
  if (statementRetention === "unlimited") return undefined;

  const months = Number(statementRetention);
  return Number.isInteger(months) && months > 0 ? months : DEFAULT_STATEMENT_RETENTION_MONTHS;
}

/**
 * The start of the transactions kept for `months` calendar months, counted from the start of today (`now` in unix
 * ms), in unix seconds. Never later than the start of the last 31 days, which the commands resync.
 */
export function getRetentionCutoff(now: number, months: number) {
  const date = new Date(now);
  const cutoff = new Date(date.getFullYear(), date.getMonth() - months, date.getDate());
  const window = resolvePeriod({ preset: "last31Days" }, date);
  return Math.min(Math.floor(cutoff.getTime() / 1000), window.from);
}

/** How far back "Sync Statements" loads history: as far as "Keep Statements For" keeps it, or a year for Unlimited. */
export function getHistoryCutoff(now: number) {
  return getRetentionCutoff(now, getRetentionMonths() ?? HISTORY_SYNC_MONTHS_UNLIMITED);
}

/**
 * Drops transactions older than `months` calendar months (counted from the start of today), or keeps all without
 * `months`. The last 31 days, which the commands resync, are always kept, even when `months` is shorter.
 */
export function prune(stored: StoredStatement, now: number, months: number | undefined): StoredStatement {
  if (months === undefined) return stored;

  const cutoffTime = getRetentionCutoff(now, months);

  return {
    ...stored,
    items: stored.items.filter((item) => item.time >= cutoffTime),
    covered: stored.covered
      .filter((range) => range.to >= cutoffTime)
      .map((range) => ({ from: Math.max(range.from, cutoffTime), to: range.to })),
  };
}

/**
 * The parts of `period` the stored statement is missing, newest first. A period that runs until now is checked
 * until the last sync: transactions since then are new, not missing.
 */
export function getPeriodGaps(stored: StoredStatement, period: StatementPeriod, now: number): TimeRange[] {
  const end = period.to ?? Math.floor((stored.syncedAt || now) / 1000);
  return getGaps(stored.covered, period.from, end);
}

/** The stored transactions in `period`, newest first. */
export function getPeriodItems(stored: StoredStatement, period: StatementPeriod) {
  return stored.items.filter((item) => item.time >= period.from && (period.to === undefined || item.time <= period.to));
}

/**
 * The request `period` needs, or `undefined` when the stored statement already has it.
 *
 * - `auto`: when a period is opened. A period within the last 31 days resyncs all 31 days (the most one request
 *   covers) once the last sync is older than the rate limit. An older period fetches what's missing, or, when it
 *   runs until now, resyncs from its start (only the last 31 days when it's longer than one request covers).
 *
 * A missing part longer than one request covers is cut to its newest 31 days.
 * - `refresh`: always requests: the last 31 days for a period within them, or the period itself when it's older.
 *   A longer period is cut like in `auto`: one running until now resyncs the last 31 days, and one with a fixed
 *   end requests its newest 31 days. The rest of it comes from the stored history.
 * - `older`: the newest missing part of the period.
 *
 * `staleAfter` (milliseconds) is how old the last sync can be before `auto` resyncs a period that runs until now.
 */
export function planRequest(
  stored: StoredStatement,
  period: StatementPeriod,
  mode: RequestMode,
  now: number,
  staleAfter = STATEMENT_RATE_LIMIT,
): StatementRequest | undefined {
  const window = resolvePeriod({ preset: "last31Days" }, new Date(now));
  const syncWindow: StatementRequest = { from: window.from };
  const isInWindow = period.from >= window.from;
  const isOngoing = period.to === undefined;
  const gaps = getPeriodGaps(stored, period, now);
  const isStale = now - stored.syncedAt >= staleAfter;

  switch (mode) {
    case "auto":
      if (isInWindow) return isStale && (isOngoing || gaps.length) ? syncWindow : undefined;
      if (isOngoing && isStale) {
        // A request can't cover a longer period, so the stored history before the window answers the rest.
        return now / 1000 - period.from > STATEMENT_MAX_PERIOD ? syncWindow : { from: period.from };
      }
      return gaps[0] && limitGap(gaps[0]);
    case "refresh":
      if (isInWindow) return syncWindow;
      if (period.to === undefined) {
        return now / 1000 - period.from > STATEMENT_MAX_PERIOD ? syncWindow : { from: period.from };
      }
      // Older stored transactions stay, since a response only replaces the range it covers.
      return limitGap({ from: period.from, to: period.to });
    case "older":
      return gaps[0] && limitGap(gaps[0]);
  }
}

/** The newest part of `gap` one request can cover. */
function limitGap(gap: TimeRange): TimeRange {
  return { from: Math.max(gap.from, gap.to - STATEMENT_MAX_PERIOD + 1), to: gap.to };
}

/**
 * Unix seconds: the start of the stored history that runs without gaps into the last 31 days, or `undefined` when
 * nothing before them is stored. Any period from then on can be answered, as the last 31 days take one request.
 */
export function getStoredSince(stored: StoredStatement, now: number): number | undefined {
  const window = resolvePeriod({ preset: "last31Days" }, new Date(now));
  const range = stored.covered.find((covered) => covered.from < window.from && covered.to >= window.from - 1);
  return range?.from;
}

/** A period too long for one request, with part of it not stored. */
export class PeriodTooLongError extends Error {
  constructor(
    /** Unix seconds: the latest end of a period with the same start that one request covers. */
    readonly suggestedTo: number,
    /** Unix seconds: see `getStoredSince`. */
    readonly storedSince: number | undefined,
  ) {
    super("The period is longer than 31 days, the most monobank returns at once");
    this.name = "PeriodTooLongError";
  }
}

function getScope() {
  const { token } = getPreferenceValues<Preferences>();
  return getTokenFingerprint(token);
}

function isStoredStatement(value: unknown): value is StoredStatement {
  if (typeof value !== "object" || value === null) return false;
  const { scope, items, covered, syncedAt } = value as Partial<Record<keyof StoredStatement, unknown>>;
  return typeof scope === "string" && Array.isArray(items) && Array.isArray(covered) && typeof syncedAt === "number";
}

/** The stored statement as is, or an empty one when there's none for the current token. */
async function readRaw(accountId: string): Promise<StoredStatement> {
  const scope = getScope();
  const stored = await readJson<unknown>(getStatementKey(accountId));
  if (isStoredStatement(stored) && stored.scope === scope) return stored;
  return { scope, items: [], covered: [], syncedAt: 0 };
}

/** Accounts pruned since the command (or AI tool) started. */
const prunedAccounts = new Set<string>();

/**
 * The stored statement of an account. Old transactions are dropped on the first read of each account in a
 * command run, so a period fetched beyond the retention period stays until the command closes.
 */
export async function readStoredStatement(accountId: string): Promise<StoredStatement> {
  const stored = await readRaw(accountId);
  if (prunedAccounts.has(accountId)) return stored;

  prunedAccounts.add(accountId);
  const pruned = prune(stored, Date.now(), getRetentionMonths());
  if (pruned.items.length !== stored.items.length || pruned.covered.length !== stored.covered.length) {
    await writeJson(getStatementKey(accountId), pruned);
  }
  return pruned;
}

/**
 * Merges a response into the stored statement and returns the result. Reads storage again first, so a statement
 * saved meanwhile (e.g. by the AI tool while a command is open) isn't overwritten.
 */
export async function saveResponse(
  accountId: string,
  request: StatementRequest,
  page: StatementItemResponse[],
  fetchedAt: number,
): Promise<StoredStatement> {
  const next = mergeResponse(await readRaw(accountId), request, page, fetchedAt);
  await writeJson(getStatementKey(accountId), next);
  return next;
}

export interface LoadedStatement {
  /** Newest first. */
  items: StatementItemResponse[];
  /**
   * Whether the period has transactions that aren't loaded (monobank returns up to 500 per request). `items` then
   * only has the transactions since `loadedSince`.
   */
  incomplete: boolean;
  /** Unix seconds. */
  loadedSince?: number;
  /** Unix milliseconds of the request the statement is from. */
  fetchedAt: number;
}

/**
 * The statement of an account or jar from `period.from` to `period.to` (unix seconds; without `to`, until now).
 *
 * Uses the statement "Show Statement" stores. A period the stored statement covers is returned without a request,
 * except that one running until now is resynced once the last sync is older than 60 seconds. A period longer than
 * 31 days works when the stored statement has everything before the last 31 days, and throws `PeriodTooLongError`
 * otherwise, since a request covers at most 31 days. A request waits for
 * monobank's limit of one statement request per 60 seconds, which is shared with the commands, and is retried
 * once if monobank still answers 429. `staleAfter` replaces the 60 seconds after which a period running until now
 * is resynced (see `planRequest`).
 */
export async function loadStatement(
  accountId: string,
  period: StatementPeriod,
  { staleAfter }: { staleAfter?: number } = {},
): Promise<LoadedStatement> {
  const { from, to } = period;
  const { token } = getPreferenceValues<Preferences>();

  try {
    requireToken(token);
  } catch (error) {
    throw toUserFacingError(error);
  }

  const nowMs = Date.now();
  const now = Math.floor(nowMs / 1000);
  const end = to ?? now;
  const isLong = end - from > STATEMENT_MAX_PERIOD;
  // A long period is checked against the stored statement below, so only the other checks apply here.
  const invalid = validatePeriod(isLong ? end - STATEMENT_MAX_PERIOD : from, end);
  if (invalid) throw new Error(`${invalid}. Today is ${toLocalIso(now).slice(0, 10)}.`);

  let stored = await readStoredStatement(accountId);
  let fetchedAt = stored.syncedAt;

  if (isLong) {
    // The last 31 days take at most one request, so everything before them must be stored.
    const window = resolvePeriod({ preset: "last31Days" }, new Date(nowMs));
    if (getGaps(stored.covered, from, Math.min(end, window.from - 1)).length) {
      throw new PeriodTooLongError(getLatestPeriodEnd(from), getStoredSince(stored, nowMs));
    }
  }

  const request = planRequest(stored, period, "auto", nowMs, staleAfter);

  if (request) {
    let page: StatementItemResponse[];
    try {
      page = await withRateLimit(() => getStatement(token, accountId, request.from, request.to));
    } catch (error) {
      throw toUserFacingError(error);
    }

    fetchedAt = Date.now();
    stored = await saveResponse(accountId, request, page, fetchedAt);
  }

  const gaps = getPeriodGaps(stored, period, Date.now());
  // Only the transactions after the newest missing part, so the totals cover one complete range.
  const loadedSince = gaps[0] && gaps[0].to + 1;
  const items = getPeriodItems(stored, loadedSince === undefined ? period : { from: loadedSince, to });

  return { items, incomplete: gaps.length > 0, loadedSince, fetchedAt };
}

/** Whether a request that ended now was saved since the start of today, by any command or the AI. */
function isSyncedToday(stored: StoredStatement, now: number) {
  return stored.syncedAt >= resolvePeriod({ preset: "today" }, new Date(now)).from * 1000;
}

/** The parts of the history "Sync Statements" loads that the stored statement is missing, newest first. */
function getHistoryGaps(stored: StoredStatement, cutoff: number) {
  return getGaps(stored.covered, Math.max(cutoff, stored.historyFrom ?? 0), Math.floor(stored.syncedAt / 1000));
}

/** Whether the history "Sync Statements" loads is complete. A statement that was never synced has none of it. */
function isHistoryDone(stored: StoredStatement, cutoff: number) {
  return stored.syncedAt > 0 && !getHistoryGaps(stored, cutoff).length;
}

/** One statement request made by `syncNext`. */
export interface SyncedRequest {
  item: AccountOrJar;
  /** The period asked for. */
  requested: TimeRange;
  /**
   * The part of `requested` that's now stored: all of it, or less when the response hit `STATEMENT_PAGE_SIZE`.
   * Then it starts at the oldest transaction received, and the rest is requested next time.
   */
  loaded: TimeRange;
  /** How many transactions the response had. */
  count: number;
  /** Whether the response hit `STATEMENT_PAGE_SIZE`, so `loaded` starts later than `requested`. */
  isCut: boolean;
  /** Whether the account still has history to load after this request. */
  historyLeft: boolean;
}

export interface SyncResult {
  /** What this call synced: the last 31 days of an account (`today`), a chunk of its history, or nothing. */
  kind: "today" | "history" | "none";
  /** The request this call made, if any. */
  synced?: SyncedRequest;
  /** How many of `items` are synced today, including `synced`. */
  syncedToday: number;
  /** How many of `items` have their history loaded back to the "Keep Statements For" cutoff. */
  historyDone: number;
  total: number;
}

/**
 * Makes at most one statement request for the first of `items` that needs one:
 * 1. One that wasn't synced today gets its last 31 days synced.
 * 2. Once all are synced today, one with missing history gets its newest missing part (up to 31 days) loaded,
 *    back to `getHistoryCutoff`. An account is done once its stored statement covers all of it, so a longer
 *    "Keep Statements For", or time offline, makes new history to load.
 * 3. Otherwise there's nothing to do, and no request is made.
 *
 * The request waits for the rate limit shared with the commands and the AI (see `withRateLimit`), so it can take up
 * to about 2 minutes. Token problems throw `MissingTokenError` / `InvalidTokenError` before any request.
 */
export async function syncNext(items: AccountOrJar[]): Promise<SyncResult> {
  const { token } = getPreferenceValues<Preferences>();
  requireToken(token);

  const now = Date.now();
  const cutoff = getHistoryCutoff(now);
  const stored = await Promise.all(items.map((item) => readStoredStatement(item.id)));

  const getResult = (kind: SyncResult["kind"], synced?: SyncedRequest): SyncResult => ({
    kind,
    synced,
    syncedToday: stored.filter((statement) => isSyncedToday(statement, now)).length,
    historyDone: stored.filter((statement) => isHistoryDone(statement, cutoff)).length,
    total: items.length,
  });

  const todayIndex = stored.findIndex((statement) => !isSyncedToday(statement, now));
  if (todayIndex !== -1) {
    const item = items[todayIndex];
    const window = resolvePeriod({ preset: "last31Days" }, new Date(now));
    // "refresh" always requests, so `request` is defined.
    const request = planRequest(stored[todayIndex], { from: window.from }, "refresh", now) ?? { from: window.from };
    const page = await withRateLimit(() => getStatement(token, item.id, request.from, request.to));
    const fetchedAt = Date.now();
    stored[todayIndex] = await saveResponse(item.id, request, page, fetchedAt);
    return getResult("today", describeRequest(item, request, page, fetchedAt, stored[todayIndex], cutoff));
  }

  const historyIndex = stored.findIndex((statement) => getHistoryGaps(statement, cutoff).length > 0);
  if (historyIndex === -1) return getResult("none");

  const item = items[historyIndex];
  const gap = getHistoryGaps(stored[historyIndex], cutoff)[0];
  const request = { from: Math.max(gap.from, gap.to - STATEMENT_MAX_PERIOD + 1), to: gap.to };

  let page: StatementItemResponse[];
  const fetchedAt = Date.now();
  try {
    page = await withRateLimit(() => getStatement(token, item.id, request.from, request.to));
    stored[historyIndex] = await saveResponse(item.id, request, page, fetchedAt);
  } catch (error) {
    // A rejected range (e.g. older than monobank keeps) stops this account's history there, so the next runs move on.
    // Rate limits and server errors are temporary, so the same range is retried next time.
    if (error instanceof ApiError && !(error instanceof RateLimitError) && error.status < 500) {
      await saveHistoryFrom(item.id, request.to + 1);
    }
    throw error;
  }

  return getResult("history", describeRequest(item, request, page, fetchedAt, stored[historyIndex], cutoff));
}

function describeRequest(
  item: AccountOrJar,
  request: StatementRequest,
  page: StatementItemResponse[],
  fetchedAt: number,
  saved: StoredStatement,
  cutoff: number,
): SyncedRequest {
  const requested = { from: request.from, to: request.to ?? Math.floor(fetchedAt / 1000) };
  const isCut = page.length >= STATEMENT_PAGE_SIZE;
  const oldest = Math.min(...page.map((transaction) => transaction.time));

  return {
    item,
    requested,
    loaded: { from: isCut ? oldest : requested.from, to: requested.to },
    count: page.length,
    isCut,
    historyLeft: getHistoryGaps(saved, cutoff).length > 0,
  };
}

/** Stops the history of an account at `historyFrom` (unix seconds). */
async function saveHistoryFrom(accountId: string, historyFrom: number) {
  const stored = await readRaw(accountId);
  await writeJson(getStatementKey(accountId), { ...stored, historyFrom });
}

/**
 * Sends `request` once monobank's rate limit allows it, at a time reserved with the commands, the menu bar and the
 * AI (see `reserveStatementSlot`). On a 429, waits a full minute and retries once.
 */
async function withRateLimit<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await sendInSlot(request);
  } catch (error) {
    if (!(error instanceof RateLimitError)) throw error;

    // The limit was used elsewhere, e.g. by another app with the same token.
    return await sendInSlot(request, Date.now() + STATEMENT_RATE_LIMIT);
  }
}

async function sendInSlot<T>(request: () => Promise<T>, notBefore?: number): Promise<T> {
  const slot = await reserveStatementSlot({ notBefore });
  await sleep(slot.at - Date.now());
  return await request();
}
