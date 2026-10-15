/**
 * My Messages: a conversation list like Google Chat's Home. Pure: no Raycast imports.
 *
 * Each conversation shows the newest message from someone else as its preview. The user's own messages
 * are never previewed or counted; when the newest message is theirs, the row says "You replied".
 */

import type { Message } from "../api/types";
import { type UserNames } from "./chat-format";
import { messageSnippet, senderName } from "./message-view";

/** Read conversations per page of the Read section. */
export const READ_PAGE_SIZE = 25;
/** `spaces.messages.list` page size when looking for the newest message from someone else. */
export const LATEST_PAGE_SIZE = 5;
/** Stop after this many pages of the user's own messages; the row then has no preview. */
export const LATEST_MAX_PAGES = 3;

export type HomeView = "all" | "unread";

function time(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** Whether the signed-in user (`users/{id}`) sent the message. */
export function isOwnMessage(message: Pick<Message, "sender">, me: string | undefined): boolean {
  const sender = message.sender?.name;
  return !!sender && (sender === "users/me" || (!!me && sender === me));
}

/** Messages newest first (a copy). Messages without a create time go last. */
export function newestFirst<T extends Pick<Message, "createTime">>(messages: T[]): T[] {
  return [...messages].sort((a, b) => (time(b.createTime) ?? 0) - (time(a.createTime) ?? 0));
}

/** The message to preview: the newest one not sent by the user. */
export function choosePreview<T extends Pick<Message, "createTime" | "sender">>(
  messages: T[],
  me: string | undefined,
): T | undefined {
  return newestFirst(messages).find((message) => !isOwnMessage(message, me));
}

/** Whether the newest message in the conversation is the user's own. */
export function youReplied(messages: Pick<Message, "createTime" | "sender">[], me: string | undefined): boolean {
  const newest = newestFirst(messages)[0];
  return !!newest && isOwnMessage(newest, me);
}

/**
 * For an unread conversation: whether its newest message may be one the unread result doesn't hold
 * (such as the user's own reply), so it's worth listing the newest message to check for "You replied".
 */
export function needsLatestCheck(lastActiveTime: string | undefined, latestUnreadTime: string | undefined): boolean {
  const active = time(lastActiveTime);
  const unread = time(latestUnreadTime);
  return active !== undefined && (unread === undefined || active > unread);
}

/** The newest of several timestamps, as a Date. */
export function latestDate(...values: (string | undefined)[]): Date | undefined {
  const times = values.map(time).filter((t): t is number => t !== undefined);
  return times.length > 0 ? new Date(Math.max(...times)) : undefined;
}

/** Users whose names a preview needs: the sender and everyone mentioned (not `users/all`). */
export function previewUsers(message: Pick<Message, "sender" | "annotations">): string[] {
  const users = new Set<string>();
  if (message.sender?.name && message.sender.type !== "BOT") users.add(message.sender.name);
  for (const annotation of message.annotations ?? []) {
    const user = annotation.userMention?.user?.name;
    if (annotation.type === "USER_MENTION" && user && user !== "users/all") users.add(user);
  }
  return [...users];
}

/** Only the names a message's preview uses, so cached rows stay small. */
export function namesFor(message: Pick<Message, "sender" | "annotations"> | undefined, names: UserNames): UserNames {
  if (!message) return {};
  return Object.fromEntries(previewUsers(message).flatMap((user) => (names[user] ? [[user, names[user]]] : [])));
}

/**
 * `Sender: text` in plain text, with mentions as `@Name`. `fallbackSender` (the other person, for DMs)
 * is used when the sender's name isn't known.
 */
export function previewText(message: Message, names: UserNames = {}, fallbackSender?: string): string {
  const name = senderName(message, names);
  const sender = name === "Unknown" && fallbackSender ? fallbackSender : name;
  return `${sender}: ${messageSnippet(message, names)}`;
}

/** Splits conversations into Unread and Read: a conversation listed as unread never shows under Read too. */
export function splitSections<U extends { spaceName: string }, R extends { item: { space: { name: string } } }>(
  unread: U[],
  rows: R[],
): { unread: U[]; read: R[] } {
  const unreadNames = new Set(unread.map((entry) => entry.spaceName));
  const seen = new Set<string>();
  const read = rows.filter((row) => {
    const name = row.item.space.name;
    if (unreadNames.has(name) || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
  return { unread, read };
}

/**
 * The next page of the Read section from `offset` in every conversation (most recently active first): it runs
 * until it holds `pageSize` conversations that aren't currently unread, and also keeps the unread ones it
 * passes. Those stay in the page (their rows come from the unread result, at no request cost) so that the
 * Unread/Read split is made at render time against the latest unread result: a conversation read elsewhere
 * or marked as read moves to Read without reloading the pages.
 */
export function planReadPage<T extends { name: string }>(
  spaces: T[],
  offset: number,
  unreadNames: ReadonlySet<string>,
  pageSize: number = READ_PAGE_SIZE,
): { items: T[]; nextOffset: number; hasMore: boolean } {
  const items: T[] = [];
  let read = 0;
  let index = Math.max(0, offset);
  while (index < spaces.length && read < pageSize) {
    const space = spaces[index++];
    items.push(space);
    if (!unreadNames.has(space.name)) read++;
  }
  return { items, nextOffset: index, hasMore: index < spaces.length };
}

/** `all` or `unread`, else undefined. */
export function parseView(value: unknown): HomeView | undefined {
  return value === "all" || value === "unread" ? value : undefined;
}

/**
 * Which view to show: a launch context of `{ view: "unread" }` (from Unread Chat) wins for that launch,
 * then the view the user last picked, then the Default View preference, then All.
 */
export function resolveView(options: { launch?: unknown; stored?: unknown; preference?: unknown }): HomeView {
  if (parseView(options.launch) === "unread") return "unread";
  return parseView(options.stored) ?? parseView(options.preference) ?? "all";
}
