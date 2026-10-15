/**
 * The Mentions section of My Messages: recent messages that @mention the user, newest first, from
 * `spaces.messages.search`. Pure: no Raycast imports.
 */

import type { Message, SpaceItem } from "../api/types";
import type { UserNames } from "./chat-format";
import { spaceKind } from "./dm-names";
import { isOwnMessage, namesFor, newestFirst } from "./my-messages";
import { buildSearchFilter } from "./search";
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

/**
 * Filter for `POST /v1/spaces/-/messages:search` that returns messages mentioning the user from the last
 * `days` days, for example `annotations.user_mentions.user.name:users/me AND create_time >= "2026-10-08T12:00:00.000Z"`.
 * Only the documented `users/me` alias is used: `users/all` isn't a documented value for this field.
 */
export function mentionsSearchFilter(days: number, now: Date = new Date()): string {
  return buildSearchFilter("", "mentions", now, days);
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
  days: number;
  limit: number;
  /** The signed-in user, `users/{id}`. */
  me: string | undefined;
  /** Called when a page after the first fails; the earlier pages are kept. */
  onPageError?: (error: unknown) => void;
  now?: Date;
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
 * Pages mention search results until `limit` messages from others are found, there are no more pages, or
 * `maxPages` were read. The filter is built once, as Google rejects a `pageToken` sent with a different
 * filter (and the filter holds the time it was built). A failure on the first page is thrown.
 */
export async function collectMentions(
  options: CollectMentionsOptions,
): Promise<{ messages: Message[]; capped: boolean }> {
  const { fetchPage, days, limit, me, onPageError, now = new Date(), maxPages = MENTIONS_MAX_PAGES } = options;
  const filter = mentionsSearchFilter(days, now);
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

/** A row in the Mentions section. */
export interface MentionRow {
  message: Message;
  item: SpaceItem;
  /** Names of the message's sender and the people it mentions. */
  names: UserNames;
}

/**
 * Rows for mention messages, newest first, each with its conversation (from `items`, by space name) and only
 * the names its preview needs. A conversation missing from `items` gets a placeholder title.
 */
export function mentionRows(
  messages: Message[],
  items: ReadonlyMap<string, SpaceItem>,
  names: UserNames,
): MentionRow[] {
  return newestFirst(messages).map((message) => {
    const spaceName = messageSpaceName(message);
    const item = items.get(spaceName) ?? { space: { name: spaceName }, title: "Conversation", kind: spaceKind({}) };
    return { message, item, names: namesFor(message, names) };
  });
}

/** Names of the messages that count as unread in the shared unread result (see `countsAsUnread`). */
export function unreadMessageNames(groups: Pick<UnreadGroup, "messages">[]): Set<string> {
  return new Set(groups.flatMap((group) => group.messages.map((message) => message.name)));
}

/**
 * Mention rows with whether each message is unread (listed in the shared unread result). In Unread Only,
 * only the unread ones.
 */
export function visibleMentions<R extends { message: Pick<Message, "name"> }>(
  rows: R[],
  unreadNames: ReadonlySet<string>,
  unreadOnly: boolean,
): (R & { unread: boolean })[] {
  const marked = rows.map((row) => ({ ...row, unread: unreadNames.has(row.message.name) }));
  return unreadOnly ? marked.filter((row) => row.unread) : marked;
}

/**
 * Subtitle of the Mentions section: `5 in the last 7 days · 2 unread`, `1 in the last day`, or
 * `20+ in the last 7 days` when more may exist than are shown.
 */
export function mentionsSubtitle(shown: number, capped: boolean, unread: number, days: number): string {
  const window = days === 1 ? "the last day" : `the last ${days} days`;
  const parts = [`${countLabel(shown, capped)} in ${window}`];
  if (unread > 0) parts.push(`${unread} unread`);
  return parts.join(" · ");
}
