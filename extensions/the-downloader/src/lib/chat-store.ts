import { ChatTurn } from "./link-chat.js";
import { LinkContext, LinkKind } from "./link-context.js";
import { jsonStore } from "./json-store.js";

/** A conversation about one link, kept so it can be continued later. */
export type StoredChat = {
  key: string;
  url: string;
  title: string;
  /** Missing on chats saved before Chat About Link, which were all about videos. */
  kind?: LinkKind;
  /** The channel or author. */
  channel?: string;
  thumbnail?: string;
  updatedAt: number;
  /** Oldest first. */
  turns: ChatTurn[];
};

export const CHAT_LIMIT = 40;
export const TURN_LIMIT = 60;

/**
 * One chat per link, keyed by its reader: `<extractor>:<id>` for videos (the
 * key Chat About Video used, so older chats still open), `<category>:<id>`
 * for posts, the URL for pages.
 */
export function chatKey(ctx: Pick<LinkContext, "key">): string {
  return ctx.key;
}

function isTurn(value: unknown): value is ChatTurn {
  const t = value as Partial<ChatTurn> | null;
  return !!t && typeof t.question === "string" && typeof t.answer === "string";
}

function isChat(value: unknown): value is StoredChat {
  const c = value as Partial<StoredChat> | null;
  return (
    !!c &&
    typeof c.key === "string" &&
    typeof c.url === "string" &&
    typeof c.title === "string" &&
    typeof c.updatedAt === "number" &&
    Array.isArray(c.turns) &&
    c.turns.every(isTurn)
  );
}

export function parseChats(raw: string | undefined): StoredChat[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isChat) : [];
  } catch {
    return [];
  }
}

/** Replace the chat with the same key, newest first, within the limits. */
export function upsertChat(list: StoredChat[], chat: StoredChat, limit = CHAT_LIMIT): StoredChat[] {
  const trimmed = { ...chat, turns: chat.turns.slice(-TURN_LIMIT) };
  return [trimmed, ...list.filter((c) => c.key !== chat.key)].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
}

const store = jsonStore<StoredChat>("video-chats-v1", parseChats);

// When the user deleted each chat, kept apart from the chats so a save's write
// check (maybe in another command) doesn't bring a deleted chat back.
type Deletion = { key: string; at: number };
const DELETION_LIMIT = 100;

export function parseDeletions(raw: string | undefined): Deletion[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "");
    return Array.isArray(parsed)
      ? parsed.filter((d): d is Deletion => typeof d?.key === "string" && typeof d?.at === "number")
      : [];
  } catch {
    return [];
  }
}

const deletions = jsonStore<Deletion>("video-chats-deleted-v1", parseDeletions);

/** True when the user deleted the chat after `savedAt`. */
async function deletedSince(key: string, savedAt: number): Promise<boolean> {
  return (await deletions.load()).some((d) => d.key === key && d.at >= savedAt);
}

export function loadChats(): Promise<StoredChat[]> {
  return store.load();
}

export async function findChat(key: string): Promise<StoredChat | undefined> {
  return (await store.load()).find((c) => c.key === key);
}

/** Save a chat. Never throws: losing the saved copy must not break the conversation. */
export async function saveChat(chat: StoredChat): Promise<void> {
  try {
    await store.mutate(
      (list) => upsertChat(list, chat),
      async (list) =>
        list.some((c) => c.key === chat.key && c.updatedAt >= chat.updatedAt) ||
        (await deletedSince(chat.key, chat.updatedAt)),
    );
  } catch (error) {
    console.error("Could not save the chat", error);
  }
}

export async function deleteChat(key: string): Promise<StoredChat[]> {
  const at = Date.now();
  await deletions
    .mutate((list) => [...list.filter((d) => d.key !== key), { key, at }].slice(-DELETION_LIMIT))
    .catch((error) => console.error("Could not note a chat deletion", error));
  // A save made after the deletion (the chat was started again) stays.
  const deleted = (c: StoredChat) => c.key === key && c.updatedAt <= at;
  return store.mutate(
    (list) => list.filter((c) => !deleted(c)),
    (list) => !list.some(deleted),
  );
}
