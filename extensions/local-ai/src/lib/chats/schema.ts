import { isRecord, loadVersionedStore, type VersionedLoad, type VersionedStoreSpec } from "../versioned-store";
import { CHAT_STORE_VERSION, type Chat, type ChatMessage, type ChatStore } from "./types";

export type ChatMigrateResult = VersionedLoad<ChatStore>;

export function migrateChatStore(raw: string | undefined): ChatMigrateResult {
  return loadVersionedStore(raw, CHAT_STORE_SPEC);
}

export const CHAT_STORE_SPEC: VersionedStoreSpec<ChatStore> = {
  version: CHAT_STORE_VERSION,
  parse: (value) => {
    const entries: unknown = value.chats;
    if (!Array.isArray(entries)) return undefined;
    const chats = entries.flatMap((entry) => normalizeChat(entry) ?? []);
    const changed = chats.length !== entries.length || chats.some((c, i) => !sameChat(c, entries[i]));
    return { store: { version: CHAT_STORE_VERSION, chats }, changed, entries: entries.length, kept: chats.length };
  },
};

function normalizeChat(value: unknown): Chat | undefined {
  if (!isRecord(value)) return undefined;
  const id = nonEmptyString(value.id);
  if (!id || !Array.isArray(value.messages)) return undefined;
  const epoch = new Date(0).toISOString();
  const createdAt = nonEmptyString(value.createdAt) ?? epoch;
  return {
    id,
    title: nonEmptyString(value.title) ?? "New Chat",
    instructions: typeof value.instructions === "string" ? value.instructions : "",
    messages: value.messages.flatMap((message) => normalizeMessage(message, createdAt) ?? []),
    createdAt,
    updatedAt: nonEmptyString(value.updatedAt) ?? createdAt,
  };
}

function normalizeMessage(value: unknown, fallbackCreatedAt: string): ChatMessage | undefined {
  if (!isRecord(value)) return undefined;
  const id = nonEmptyString(value.id);
  if ((value.role !== "user" && value.role !== "assistant") || !id || typeof value.content !== "string") {
    return undefined;
  }
  const message: ChatMessage = {
    id,
    role: value.role,
    content: value.content,
    createdAt: nonEmptyString(value.createdAt) ?? fallbackCreatedAt,
  };
  if (typeof value.tokens === "number" && Number.isFinite(value.tokens) && value.tokens >= 0) {
    message.tokens = value.tokens;
  }
  const imagePath = nonEmptyString(value.imagePath);
  if (imagePath) message.imagePath = imagePath;
  const interruptedReason = nonEmptyString(value.interruptedReason);
  if (interruptedReason && value.role === "assistant") {
    message.interruptedReason = interruptedReason;
    const interruptedExplanation = nonEmptyString(value.interruptedExplanation);
    if (interruptedExplanation) message.interruptedExplanation = interruptedExplanation;
  }
  return message;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function sameChat(chat: Chat, original: unknown): boolean {
  if (!isRecord(original) || !Array.isArray(original.messages)) return false;
  const scalarsMatch = (["id", "title", "instructions", "createdAt", "updatedAt"] as const).every(
    (key) => original[key] === chat[key],
  );
  return (
    scalarsMatch &&
    chat.messages.length === original.messages.length &&
    chat.messages.every((message, i) => sameMessage(message, (original.messages as unknown[])[i]))
  );
}

function sameMessage(message: ChatMessage, original: unknown): boolean {
  if (!isRecord(original)) return false;
  return (Object.keys(message) as (keyof ChatMessage)[]).every((key) => original[key] === message[key]);
}
