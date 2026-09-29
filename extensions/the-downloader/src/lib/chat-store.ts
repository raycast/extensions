import { ChatTurn } from "./video-chat.js";
import { VideoContext } from "./video-context.js";
import { jsonStore } from "./json-store.js";

/** A conversation about one video, kept so it can be continued later. */
export type StoredChat = {
  key: string;
  url: string;
  title: string;
  channel?: string;
  thumbnail?: string;
  updatedAt: number;
  /** Oldest first. */
  turns: ChatTurn[];
};

export const CHAT_LIMIT = 40;
export const TURN_LIMIT = 60;

/** One chat per video: keyed by site and video ID when known, otherwise by URL. */
export function chatKey(ctx: Pick<VideoContext, "url" | "video">): string {
  const { id, extractor_key } = ctx.video;
  return id && extractor_key ? `${extractor_key.toLowerCase()}:${id}` : ctx.url;
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

export function removeChat(list: StoredChat[], key: string): StoredChat[] {
  return list.filter((c) => c.key !== key);
}

const store = jsonStore<StoredChat>("video-chats-v1", parseChats);

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
      (list) => list.some((c) => c.key === chat.key && c.updatedAt >= chat.updatedAt),
    );
  } catch (error) {
    console.error("Could not save the chat", error);
  }
}

export function deleteChat(key: string): Promise<StoredChat[]> {
  return store.mutate(
    (list) => removeChat(list, key),
    (list) => !list.some((c) => c.key === key),
  );
}
