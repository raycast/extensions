/**
 * The Mentions section of My Messages: recent messages that @mention the user, newest first, from
 * `spaces.messages.search`. Pure: no Raycast imports.
 */

import type { Message, SpaceItem } from "../api/types";
import type { UserNames } from "./chat-format";
import { spaceKind } from "./dm-names";
import { isOwnMessage, namesFor, newestFirst } from "./my-messages";
import { countLabel, messageSpaceName, type UnreadGroup } from "./unread";

/** Values of the "Mentions From" preference, in days. */
export const MENTIONS_DAYS_OPTIONS = [1, 3, 7, 14];
export const DEFAULT_MENTIONS_DAYS = 7;
/** Values of the "Mentions Shown" preference. */
export const MENTIONS_LIMIT_OPTIONS = [10, 20, 50];
export const DEFAULT_MENTIONS_LIMIT = 20;
/** Stop after this many search pages, even if the user's own messages kept the section short. */
export const MENTIONS_MAX_PAGES = 3;

function parseOption(value: unknown, options: number[], fallback: number): number {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return options.includes(parsed) ? parsed : fallback;
}

/** Parses the "Mentions From" preference: 1, 3, 7 or 14 days, else 7. */
export function parseMentionsDays(value: unknown): number {
  return parseOption(value, MENTIONS_DAYS_OPTIONS, DEFAULT_MENTIONS_DAYS);
}

/** Parses the "Mentions Shown" preference: 10, 20 or 50 rows, else 20. */
export function parseMentionsLimit(value: unknown): number {
  return parseOption(value, MENTIONS_LIMIT_OPTIONS, DEFAULT_MENTIONS_LIMIT);
}

/** The two `POST /v1/spaces/-/messages:search` filters of one Mentions load, with the same cutoff. */
export interface MentionsFilters {
  /** Messages mentioning the user from the last `days` days. */
  mentions: string;
  /** The same, unread only: the mentions that are unread. */
  unreadMentions: string;
}

const MENTIONS_ME = "annotations.user_mentions.user.name:users/me";

/**
 * Filters for messages mentioning the user from the last `days` days, for example
 * `annotations.user_mentions.user.name:users/me AND create_time >= "2026-10-08T12:00:00.000Z"`, and the unread
 * ones, `annotations.user_mentions.user.name:users/me AND is_unread() AND create_time >= "…"` (fields combine
 * with `AND`, per the discovery doc). Only the documented `users/me` alias is used: `users/all` isn't a
 * documented value for this field.
 */
export function mentionsSearchFilters(days: number, now: Date = new Date()): MentionsFilters {
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const window = `create_time >= "${since}"`;
  return { mentions: `${MENTIONS_ME} AND ${window}`, unreadMentions: `${MENTIONS_ME} AND is_unread() AND ${window}` };
}

/** One request for a page of mention search results. */
export interface MentionsPageRequest {
  filter: string;
  pageSize: number;
  pageToken?: string;
}

/** One page of mention search results, newest first. */
export interface MentionsPage {
  messages: Message[];
  nextPageToken?: string;
}

export interface CollectMentionsOptions {
  /** Loads one page of search results. */
  fetchPage: (request: MentionsPageRequest) => Promise<MentionsPage>;
  /** Sent unchanged with every page (see {@link mentionsSearchFilters}). */
  filter: string;
  limit: number;
  /** The signed-in user, `users/{id}`. */
  me: string | undefined;
  /** Called when a page after the first fails; the earlier pages are kept. */
  onPageError?: (error: unknown) => void;
  maxPages?: number;
}

/**
 * Messages that mention the user, newest first, without the user's own and without duplicates, at most `limit`.
 * `capped` means more may exist (there were more results, or later pages were left unchecked).
 */
export function selectMentions(
  messages: Message[],
  me: string | undefined,
  limit: number,
): { messages: Message[]; capped: boolean } {
  const seen = new Set<string>();
  const others = messages.filter((message) => {
    if (!message.name || seen.has(message.name) || isOwnMessage(message, me)) return false;
    seen.add(message.name);
    return true;
  });
  const sorted = newestFirst(others);
  return { messages: sorted.slice(0, limit), capped: sorted.length > limit };
}

/**
 * Pages search results for `filter` until `limit` messages from others are found, there are no more pages, or
 * `maxPages` were read. Every page sends the same filter, as Google rejects a `pageToken` sent with a different
 * filter (and the filter holds the time it was built). A failure on the first page is thrown.
 */
export async function collectMentions(
  options: CollectMentionsOptions,
): Promise<{ messages: Message[]; capped: boolean }> {
  const { fetchPage, filter, limit, me, onPageError, maxPages = MENTIONS_MAX_PAGES } = options;
  const pageSize = Math.min(100, Math.max(1, limit));
  const found: Message[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  do {
    let page: MentionsPage;
    try {
      page = await fetchPage({ filter, pageSize, pageToken });
    } catch (error) {
      if (pages === 0) throw error;
      onPageError?.(error);
      return { messages: selectMentions(found, me, limit).messages, capped: true };
    }
    pages++;
    found.push(...page.messages);
    pageToken = page.nextPageToken || undefined;
  } while (pageToken && pages < maxPages && selectMentions(found, me, limit).messages.length < limit);
  const selected = selectMentions(found, me, limit);
  return { messages: selected.messages, capped: selected.capped || !!pageToken };
}

/** Names of the unread mentions, from the unread-mentions search. */
export interface UnreadMentions {
  names: string[];
  /** Every page loaded, so a mention it doesn't list is read. */
  complete: boolean;
}

export interface CollectMentionsWithUnreadOptions extends Omit<CollectMentionsOptions, "filter"> {
  days: number;
  now?: Date;
  /** Called when the unread-mentions search fails; whether each mention is unread is then left unknown. */
  onUnreadError?: (error: unknown) => void;
}

/**
 * Mentions of the user (see {@link collectMentions}) and, from a second search run alongside, which ones are
 * unread. Both filters are built once, with the same cutoff, and page with the same limits. Only a failure of
 * the mentions search is thrown; if the unread-mentions search fails, `unread` is undefined.
 */
export async function collectMentionsWithUnread(
  options: CollectMentionsWithUnreadOptions,
): Promise<{ messages: Message[]; capped: boolean; unread?: UnreadMentions }> {
  const { days, now = new Date(), onUnreadError, ...rest } = options;
  const filters = mentionsSearchFilters(days, now);
  const loadUnread = async (): Promise<UnreadMentions | undefined> => {
    let complete = true;
    try {
      const found = await collectMentions({
        ...rest,
        filter: filters.unreadMentions,
        onPageError: (error) => {
          complete = false;
          rest.onPageError?.(error);
        },
      });
      return { names: found.messages.map((message) => message.name), complete };
    } catch (error) {
      onUnreadError?.(error);
      return undefined;
    }
  };
  const [found, unread] = await Promise.all([collectMentions({ ...rest, filter: filters.mentions }), loadUnread()]);
  return { ...found, unread };
}

/**
 * Whether a mention is unread according to the unread-mentions search: true when listed, false when that
 * search loaded in full without it, undefined (unknown) when it failed or stopped early. The search stops at
 * the same limit as the mentions, newest first, so any unread one among the mentions shown is within it.
 */
export function mentionUnread(name: string, unread: UnreadMentions | undefined): boolean | undefined {
  if (unread?.names.includes(name)) return true;
  return unread?.complete ? false : undefined;
}

/** A row in the Mentions section. */
export interface MentionRow {
  message: Message;
  item: SpaceItem;
  /** Names of the message's sender and the people it mentions. */
  names: UserNames;
  /** From the unread-mentions search (see {@link mentionUnread}); undefined when unknown. */
  unread?: boolean;
}

/**
 * Rows for mention messages, newest first, each with its conversation (from `items`, by space name), only
 * the names its preview needs, and whether it is unread per the unread-mentions search. A conversation
 * missing from `items` gets a placeholder title.
 */
export function mentionRows(
  messages: Message[],
  items: ReadonlyMap<string, SpaceItem>,
  names: UserNames,
  unread?: UnreadMentions,
): MentionRow[] {
  return newestFirst(messages).map((message) => {
    const spaceName = messageSpaceName(message);
    const item = items.get(spaceName) ?? { space: { name: spaceName }, title: "Conversation", kind: spaceKind({}) };
    return { message, item, names: namesFor(message, names), unread: mentionUnread(message.name, unread) };
  });
}

/**
 * Mentions after Mark as Read of `spaceNames`: the rows in those conversations are read. Data in another
 * shape is returned as is.
 */
export function withMentionsRead<T extends { rows: MentionRow[] }>(result: T | undefined, spaceNames: string[]) {
  if (!result || !Array.isArray(result.rows)) return result;
  const read = new Set(spaceNames);
  return {
    ...result,
    rows: result.rows.map((row) => (read.has(row.item.space.name) ? { ...row, unread: false } : row)),
  };
}

/** Names of the messages that count as unread in the shared unread result (see `countsAsUnread`). */
export function unreadMessageNames(groups: Pick<UnreadGroup, "messages">[]): Set<string> {
  return new Set(groups.flatMap((group) => group.messages.map((message) => message.name)));
}

/** The shared unread result, as the Mentions section uses it. */
export interface SharedUnread {
  /** Names of the messages it lists (see {@link unreadMessageNames}). */
  names: ReadonlySet<string>;
  /** It stopped before every unread message was checked, so one it doesn't list may still be unread. */
  capped: boolean;
  /**
   * Start of the window it searched (ms since epoch; the Unread Lookback). A mention older than this was never
   * checked, so not being listed says nothing about it.
   */
  since?: number;
}

/** Whether the shared unread search covered this message's time, so its absence there means read. */
function checkedByShared(message: Pick<Message, "createTime">, shared: SharedUnread): boolean {
  if (shared.since === undefined) return true;
  const created = Date.parse(message.createTime ?? "");
  return !Number.isNaN(created) && created >= shared.since;
}

/**
 * Mention rows with whether each message is unread: listed by the unread-mentions search or the shared unread
 * result. When the unread-mentions search couldn't tell, a mention the shared result doesn't list is read only
 * if that result is complete; otherwise it is unknown (`undefined`, no dot). Unread Only keeps the unread and
 * unknown ones, so a mention never disappears just because its state couldn't be checked.
 *
 * `stale`: the latest mentions refresh failed, so the rows (and their saved flags) are from an earlier load. Their
 * flags are then ignored and the state comes from the shared result alone, so a mention read since then doesn't
 * keep its dot. A mention older than the shared result's window (`since`) is never marked read by it: unknown.
 */
export function visibleMentions<R extends { message: Pick<Message, "name" | "createTime">; unread?: boolean }>(
  rows: R[],
  shared: SharedUnread | undefined,
  unreadOnly: boolean,
  stale = false,
): (R & { unread: boolean | undefined })[] {
  const marked = rows.map((row) => {
    const saved = stale ? undefined : row.unread;
    let unread: boolean | undefined;
    if (saved === true || shared?.names.has(row.message.name)) unread = true;
    else if (saved === false) unread = false;
    else unread = shared && !shared.capped && checkedByShared(row.message, shared) ? false : undefined;
    return { ...row, unread };
  });
  return unreadOnly ? marked.filter((row) => row.unread !== false) : marked;
}

/**
 * Subtitle of the Mentions section from its rows (see {@link visibleMentions}): `5 in the last 7 days · 2 unread`,
 * `1 in the last day`, `20+ in the last 7 days` when more may exist than are shown, or `2+ unread` when some
 * rows' state is unknown.
 */
export function mentionsSubtitle(rows: { unread: boolean | undefined }[], capped: boolean, days: number): string {
  const window = days === 1 ? "the last day" : `the last ${days} days`;
  const parts = [`${countLabel(rows.length, capped)} in ${window}`];
  const unread = rows.filter((row) => row.unread === true).length;
  const unknown = rows.some((row) => row.unread === undefined);
  if (unread > 0) parts.push(`${countLabel(unread, unknown)} unread`);
  return parts.join(" · ");
}
