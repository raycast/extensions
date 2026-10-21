import type { ChatSeed } from "../launch-context";
import type { Chat, ChatMessage } from "./types";

export const TITLE_MAX_LENGTH = 40;
export const NEW_CHAT_TITLE = "New Chat";

export interface ChatTurn {
  user: ChatMessage;
  assistant?: ChatMessage;
}

export function titleFromMessage(text: string): string {
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return NEW_CHAT_TITLE;
  return firstLine.length > TITLE_MAX_LENGTH ? `${firstLine.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…` : firstLine;
}

export function createChat(
  deps: { id: string; now: string },
  options: { instructions?: string; seed?: ChatSeed; messageIds?: [string, string] } = {},
): Chat {
  const { seed, messageIds } = options;
  const chat: Chat = {
    id: deps.id,
    title: NEW_CHAT_TITLE,
    instructions: options.instructions ?? "",
    messages: [],
    createdAt: deps.now,
    updatedAt: deps.now,
  };
  if (!seed) return chat;
  const [userId, assistantId] = messageIds ?? [`${deps.id}-user`, `${deps.id}-assistant`];
  const messages: ChatMessage[] = [
    { id: userId, role: "user", content: seed.userMessage, createdAt: deps.now },
    { id: assistantId, role: "assistant", content: seed.assistantMessage, createdAt: deps.now },
  ];
  return { ...chat, title: titleFromMessage(seed.userMessage), messages };
}

export function appendMessage(chat: Chat, message: ChatMessage, now: string): Chat {
  const title =
    chat.title === NEW_CHAT_TITLE && message.role === "user" ? titleFromMessage(message.content) : chat.title;
  return { ...chat, title, messages: [...chat.messages, message], updatedAt: now };
}

export function renameChat(chat: Chat, title: string, now: string): Chat {
  const trimmed = title.trim();
  if (!trimmed) return chat;
  return { ...chat, title: trimmed, updatedAt: now };
}

export function toTurns(messages: ChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      turns.push({ user: message });
      continue;
    }
    const last = turns[turns.length - 1];
    if (last && !last.assistant) last.assistant = message;
  }
  return turns;
}
