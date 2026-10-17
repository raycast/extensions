/**
 * Unread computation. Pure: no Raycast imports.
 *
 * The source of truth is Chat's own per-message read state: `spaces.messages.search` with `is_unread()`.
 * Like the Chat UI, it skips muted spaces, app messages, and thread replies the user doesn't follow.
 * The read-state helpers (`isSpaceUnread`, `unreadMessagesFilter`) are only for the fallback when search fails.
 */

import type { Message, Space, SpaceReadState } from "../api/types";
import { mentionsUser } from "./chat-format";
import { GoogleApiError, isAuthError, isScopeError } from "./errors";
import { spaceNameOf } from "./recipient";

export const DEFAULT_LOOKBACK_DAYS = 14;
/**
 * Stop paging search results after this many raw results once at least one of them counts as unread;
 * the total then shows as "N+".
 */
export const UNREAD_CAP = 500;
/**
 * When none of the first {@link UNREAD_CAP} raw results count as unread (all older than the read position or
 * replies in threads the user doesn't follow), keep paging up to this many before giving up, so a zero is real.
 */
export const UNREAD_SCAN_LIMIT = 1000;
/** `SearchMessagesRequest.pageSize` maximum. Divides {@link UNREAD_CAP} and {@link UNREAD_SCAN_LIMIT}. */
export const UNREAD_PAGE_SIZE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

function time(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** Parses the "Unread Lookback (Days)" preference: a whole number from 1 to 90, else the default. */
export function parseLookbackDays(value: string | undefined): number {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LOOKBACK_DAYS;
  return Math.min(parsed, 90);
}

/**
 * Filter for `POST /v1/spaces/-/messages:search` that returns the user's unread messages,
 * optionally only those created in the last `lookbackDays` days. For example:
 * `is_unread() AND create_time >= "2026-09-30T12:00:00.000Z"`.
 */
export function unreadSearchFilter(lookbackDays?: number, now: Date = new Date()): string {
  if (!lookbackDays || lookbackDays <= 0) return "is_unread()";
  const since = new Date(now.getTime() - lookbackDays * DAY_MS).toISOString();
  return `is_unread() AND create_time >= "${since}"`;
}

/** Drops messages the user sent (`me` is `users/{id}`). */
export function excludeOwnMessages(messages: Message[], me: string | undefined): Message[] {
  if (!me) return messages;
  return messages.filter((message) => message.sender?.name !== me && message.sender?.name !== "users/me");
}

/**
 * Whether Chat's Home would show a message as unread. Google's `is_unread()` also counts every unopened reply in
 * threads you don't follow, which Home never shows (in a real account, 100 of 100 such results were thread
 * replies, 99 older than the space's read position). So a message counts only when it's newer than the space's
 * read position and is either a top-level message or a reply that mentions you.
 */
export function countsAsUnread(
  message: Pick<Message, "createTime" | "threadReply" | "annotations">,
  spaceLastReadTime: string | undefined,
  me: string | undefined,
): boolean {
  const created = Date.parse(message.createTime ?? "");
  const read = spaceLastReadTime ? Date.parse(spaceLastReadTime) : Number.NaN;
  if (!Number.isNaN(read) && !Number.isNaN(created) && created <= read) return false;
  return !message.threadReply || mentionsUser(message, me);
}

/** The space a message is in: `message.space.name`, else the prefix of its resource name. */
export function messageSpaceName(message: Pick<Message, "name" | "space">): string {
  return message.space?.name || spaceNameOf(message.name);
}

/** One page of `messages:search` results. */
export interface UnreadSearchPage {
  messages: Message[];
  nextPageToken?: string;
}

export interface CollectUnreadOptions {
  /** Loads one page of `is_unread()` results, newest first. */
  fetchPage: (pageToken: string | undefined) => Promise<UnreadSearchPage>;
  /** Read positions (`lastReadTime`) of spaces; a space left out of the map has no known position. */
  readPositions: (spaceNames: string[]) => Promise<Map<string, string | undefined>>;
  /** The signed-in user, `users/{id}`. */
  me: string | undefined;
  /** Called when a page after the first fails; the earlier pages are kept. */
  onPageError?: (error: unknown) => void;
  cap?: number;
  scanLimit?: number;
}

/**
 * Pages unread search results and keeps the messages Chat's Home counts (see {@link countsAsUnread}), without
 * the user's own. Stops after `cap` raw results once one of them counts; while none do, keeps going up to
 * `scanLimit`. Read positions are loaded once per space, as new spaces turn up; below both limits the next page
 * is fetched while they load, as it's needed whatever they show. `capped` means results were
 * left unchecked (more pages, or a later page failed), so the count is a lower bound and a zero isn't certain.
 * A failure on the first page is thrown, so the caller can fall back.
 */
export async function collectUnread(options: CollectUnreadOptions): Promise<{ messages: Message[]; capped: boolean }> {
  const { fetchPage, readPositions, me, onPageError, cap = UNREAD_CAP, scanLimit = UNREAD_SCAN_LIMIT } = options;
  const visible: Message[] = [];
  const positions = new Map<string, string | undefined>();
  const looked = new Set<string>();
  let scanned = 0;
  let pages = 0;
  let pageToken: string | undefined;
  // Settled up front, so a page fetched ahead can fail while read positions load without an unhandled rejection.
  const fetchSettled = (token: string | undefined) =>
    fetchPage(token).then(
      (page) => ({ page }),
      (error: unknown) => ({ error }),
    );
  let next: ReturnType<typeof fetchSettled> | undefined = fetchSettled(undefined);
  while (next) {
    const fetched = await next;
    next = undefined;
    if ("error" in fetched) {
      // Google sometimes fails a later page with "Internal error encountered". Results are newest first, so the
      // pages already loaded hold the messages that matter; keep them and mark the total as a lower bound.
      if (pages === 0) throw fetched.error;
      onPageError?.(fetched.error);
      return { messages: visible, capped: true };
    }
    const { page } = fetched;
    pages++;
    scanned += page.messages.length;
    pageToken = page.nextPageToken || undefined;
    // Below both limits the next page is needed whatever this one holds, so it loads alongside the read positions.
    if (pageToken && scanned < Math.min(cap, scanLimit)) next = fetchSettled(pageToken);
    const others = excludeOwnMessages(page.messages, me);
    const newSpaces = [...new Set(others.map(messageSpaceName))].filter((name) => !looked.has(name));
    if (newSpaces.length > 0) {
      newSpaces.forEach((name) => looked.add(name));
      for (const [name, position] of await readPositions(newSpaces)) positions.set(name, position);
    }
    visible.push(...others.filter((m) => countsAsUnread(m, positions.get(messageSpaceName(m)), me)));
    if (!next && pageToken && scanned < (visible.length > 0 ? cap : scanLimit)) next = fetchSettled(pageToken);
  }
  return { messages: visible, capped: !!pageToken };
}

/** Unread messages in one space. */
export interface UnreadGroup {
  /** `spaces/{space}` */
  spaceName: string;
  /** Newest first. */
  messages: Message[];
  count: number;
  /** Any of the messages mentions the user (or @all). */
  mentioned: boolean;
  /** Names of the messages that mention the user. */
  mentions: string[];
  /** Create time of the newest unread message. */
  latestTime?: string;
}

/**
 * Groups unread messages by space, newest message first in each, spaces ordered by their newest
 * unread message. Duplicates (same message name) are dropped and the user's own messages excluded.
 */
export function groupUnreadBySpace(messages: Message[], me: string | undefined): UnreadGroup[] {
  const seen = new Set<string>();
  const groups = new Map<string, Message[]>();
  for (const message of excludeOwnMessages(messages, me)) {
    if (!message.name || seen.has(message.name)) continue;
    seen.add(message.name);
    const space = messageSpaceName(message);
    const list = groups.get(space) ?? [];
    list.push(message);
    groups.set(space, list);
  }
  return [...groups.entries()]
    .map(([spaceName, list]) => {
      const sorted = [...list].sort((a, b) => (time(b.createTime) ?? 0) - (time(a.createTime) ?? 0));
      const mentions = sorted.filter((m) => mentionsUser(m, me)).map((m) => m.name);
      return {
        spaceName,
        messages: sorted,
        count: sorted.length,
        mentioned: mentions.length > 0,
        mentions,
        latestTime: sorted[0]?.createTime,
      };
    })
    .sort((a, b) => (time(b.latestTime) ?? 0) - (time(a.latestTime) ?? 0));
}

/** Total unread messages across groups. */
export function countUnread(groups: Pick<UnreadGroup, "count">[]): number {
  return groups.reduce((sum, group) => sum + group.count, 0);
}

/** `37`, or `500+` when the count stopped at the cap. */
export function countLabel(count: number, capped: boolean): string {
  return capped ? `${count}+` : `${count}`;
}

/** Said instead of "No unread messages" when the search stopped before checking every result. */
export const UNREAD_CHECK_INCOMPLETE = "Unread check incomplete";

/** `No unread messages`, or {@link UNREAD_CHECK_INCOMPLETE} when results were left unchecked. */
function noUnread(capped: boolean): string {
  return capped ? UNREAD_CHECK_INCOMPLETE : "No unread messages";
}

/**
 * `37 unread in 6 spaces`, `1 unread in 1 space`, `500+ unread in 40 spaces` at the cap, `No unread messages`,
 * or `Unread check incomplete` when none counted but results were left unchecked.
 */
export function unreadSummary(total: number, capped: boolean, spaces: number): string {
  if (total <= 0) return noUnread(capped);
  return `${countLabel(total, capped)} unread in ${spaces} ${spaces === 1 ? "space" : "spaces"}`;
}

/** Title and description of My Messages' empty Unread Only view, once the check has finished. */
export function unreadEmptyView(
  unread: { capped: boolean; source: "search" | "readState" } | undefined,
  lookbackDays: number,
): { title: string; description: string } {
  if (unread?.capped) {
    return {
      title: UNREAD_CHECK_INCOMPLETE,
      description:
        "The check stopped before it reached every result, and none so far count as unread. Refresh, or open Google Chat to see the rest.",
    };
  }
  return {
    title: "No unread messages",
    description:
      unread?.source === "readState"
        ? `Nothing after your read position in spaces active in the last ${lookbackDays} days.`
        : `Nothing unread from the last ${lookbackDays} days. Muted spaces aren't counted.`,
  };
}

/** Unread groups plus totals. */
export interface UnreadResult<T extends Pick<UnreadGroup, "spaceName" | "count" | "mentioned">> {
  spaces: T[];
  total: number;
  /** The search stopped at {@link UNREAD_CAP}, so `total` is a lower bound. */
  capped: boolean;
  /** Where the counts came from: Chat's unread state, or the read-position fallback. */
  source: "search" | "readState";
}

/** Some conversations couldn't be marked read; `marked` lists the ones that were. */
export class MarkReadError extends Error {
  readonly marked: string[];
  readonly failed: string[];
  /** The first failure. */
  readonly reason: unknown;

  constructor(marked: string[], failed: string[], reason: unknown) {
    const detail = reason instanceof Error ? reason.message : String(reason);
    const total = marked.length + failed.length;
    super(`Couldn't mark ${failed.length} of ${total} conversations as read: ${detail}`);
    this.name = "MarkReadError";
    this.marked = marked;
    this.failed = failed;
    this.reason = reason;
  }
}

/**
 * Splits `Promise.allSettled` results of marking `names` read into the ones marked and the error to throw:
 * none when all succeeded, the first failure itself when none did, else a {@link MarkReadError}.
 */
export function settleMarkRead(
  names: string[],
  results: PromiseSettledResult<unknown>[],
): { marked: string[]; error?: unknown } {
  const marked = names.filter((_, i) => results[i]?.status === "fulfilled");
  const failures = names.flatMap((name, i) => {
    const result = results[i];
    return result?.status === "rejected" ? [{ name, reason: result.reason as unknown }] : [];
  });
  if (failures.length === 0) return { marked };
  if (marked.length === 0) return { marked, error: failures[0].reason };
  return {
    marked,
    error: new MarkReadError(
      marked,
      failures.map((f) => f.name),
      failures[0].reason,
    ),
  };
}

/**
 * Removes spaces (after Mark as Read) and recomputes the totals. A capped result stays capped: results past
 * the cap were never checked, so marking everything loaded as read doesn't make the total zero.
 */
export function withoutSpaces<T extends Pick<UnreadGroup, "spaceName" | "count" | "mentioned">>(
  result: UnreadResult<T>,
  spaceNames: Iterable<string>,
): UnreadResult<T> {
  const names = new Set(spaceNames);
  const spaces = result.spaces.filter((space) => !names.has(space.spaceName));
  const removed = result.spaces.filter((space) => names.has(space.spaceName));
  return {
    ...result,
    spaces,
    total: Math.max(0, result.total - countUnread(removed)),
  };
}

/**
 * Whether a failed `messages:search` should fall back to the read-state logic: the request was
 * rejected (400, 403, 404, 501), but not because of sign-in or a missing scope.
 */
export function shouldFallBackFromSearch(error: unknown): boolean {
  if (!(error instanceof GoogleApiError)) return false;
  if (isAuthError(error) || isScopeError(error)) return false;
  return [400, 403, 404, 501].includes(error.status);
}

// --- Read-state fallback ---------------------------------------------------------------------

/** Spaces with a message in the last `days` days, most recently active first. */
export function recentlyActiveSpaces(spaces: Space[], days: number, now: number = Date.now()): Space[] {
  const since = now - days * DAY_MS;
  return spaces
    .filter((space) => (time(space.lastActiveTime) ?? 0) >= since)
    .sort((a, b) => (time(b.lastActiveTime) ?? 0) - (time(a.lastActiveTime) ?? 0));
}

/**
 * Fallback only: a space may have unread messages when its last message is newer than the user's
 * `lastReadTime`. A read state without `lastReadTime` is skipped rather than guessed.
 */
export function isSpaceUnread(space: Pick<Space, "lastActiveTime">, readState: SpaceReadState | undefined): boolean {
  const active = time(space.lastActiveTime);
  const read = time(readState?.lastReadTime);
  if (active === undefined || read === undefined) return false;
  return active > read;
}

/**
 * Fallback only: the `spaces.messages.list` filter for messages after the last read time, or after the
 * lookback start when that's later (a read position can be months old).
 */
export function unreadMessagesFilter(
  readState: SpaceReadState | undefined,
  lookbackDays?: number,
  now: number = Date.now(),
): string | undefined {
  const lastRead = readState?.lastReadTime;
  if (!lastRead) return undefined;
  if (lookbackDays && lookbackDays > 0) {
    const since = now - lookbackDays * DAY_MS;
    const read = time(lastRead);
    if (read === undefined || read < since) return `create_time > "${new Date(since).toISOString()}"`;
  }
  return `create_time > "${lastRead}"`;
}

// --- Root search subtitle and the shared result ------------------------------------------------

/** Subtitle when the check failed. */
export const UNREAD_CHECK_FAILED = "Couldn't check unread";

/** Messages that mention the user, across groups. */
export function countMentions(groups: Pick<UnreadGroup, "mentions">[]): number {
  return groups.reduce((sum, group) => sum + (group.mentions?.length ?? 0), 0);
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * Root search subtitle of My Messages and Unread Chat: `12 unread · 4 spaces · 2 mentions`, `3+ unread` at the
 * cap, `No unread messages`, or `Unread check incomplete` when none counted but results were left unchecked.
 */
export function unreadSubtitle(total: number, capped: boolean, spaces: number, mentions: number): string {
  if (total <= 0) return noUnread(capped);
  const parts = capped ? [`${countLabel(total, true)} unread`] : [`${total} unread`, plural(spaces, "space")];
  if (mentions > 0) parts.push(plural(mentions, "mention"));
  return parts.join(" · ");
}

/** The last unread result, shared by Unread Chat, My Messages and the AI tool. */
export interface SharedUnreadEntry<T> {
  /** When the search finished (ms since epoch). */
  at: number;
  lookbackDays: number;
  result: T;
}

/** The shared result when it's for the same lookback and at most `maxAgeMs` old (never with `maxAgeMs` 0). */
export function freshSharedUnread<T>(
  entry: SharedUnreadEntry<T> | undefined,
  lookbackDays: number,
  maxAgeMs: number,
  now: number = Date.now(),
): T | undefined {
  if (!entry || maxAgeMs <= 0 || entry.lookbackDays !== lookbackDays) return undefined;
  const age = now - entry.at;
  return age >= 0 && age < maxAgeMs ? entry.result : undefined;
}
