import { LocalStorage } from "@raycast/api";
import { Conversation, ChatMessage } from "./types";

const INDEX_KEY = "conversation_index";
const CONV_PREFIX = "conv_";
const MAX_INDEX_ENTRIES = 100;

interface ConversationIndexEntry {
  id: string;
  title: string;
  model: string;
  updatedAt: number;
}

export async function saveConversation(
  conversation: Conversation,
): Promise<void> {
  // Store the full conversation
  await LocalStorage.setItem(
    `${CONV_PREFIX}${conversation.id}`,
    JSON.stringify(conversation),
  );

  // Update the index
  const index = await getIndex();
  const existing = index.findIndex((entry) => entry.id === conversation.id);
  const entry: ConversationIndexEntry = {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    updatedAt: conversation.updatedAt,
  };

  if (existing !== -1) {
    index.splice(existing, 1);
  }
  index.push(entry);

  // Sort by updatedAt descending (most recent first)
  index.sort((a, b) => b.updatedAt - a.updatedAt);

  // Enforce max entries — drop oldest (end of sorted array)
  if (index.length > MAX_INDEX_ENTRIES) {
    const removed = index.splice(MAX_INDEX_ENTRIES);
    // Clean up the dropped conversation records
    for (const old of removed) {
      await LocalStorage.removeItem(`${CONV_PREFIX}${old.id}`);
    }
  }

  await LocalStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export async function getConversation(
  id: string,
): Promise<Conversation | null> {
  const raw = await LocalStorage.getItem<string>(`${CONV_PREFIX}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Conversation;
  } catch {
    console.error(`[storage] Corrupted conversation data for ${id}`);
    return null;
  }
}

export async function listConversations(): Promise<ConversationIndexEntry[]> {
  return await getIndex();
}

export async function deleteConversation(id: string): Promise<void> {
  await LocalStorage.removeItem(`${CONV_PREFIX}${id}`);

  const index = await getIndex();
  const updated = index.filter((entry) => entry.id !== id);
  await LocalStorage.setItem(INDEX_KEY, JSON.stringify(updated));
}

export async function updateConversationTitle(
  id: string,
  title: string,
): Promise<void> {
  // Update the full conversation record
  const conversation = await getConversation(id);
  if (conversation) {
    conversation.title = title;
    await LocalStorage.setItem(
      `${CONV_PREFIX}${id}`,
      JSON.stringify(conversation),
    );
  }

  // Update the index entry
  const index = await getIndex();
  const entry = index.find((e) => e.id === id);
  if (entry) {
    entry.title = title;
    await LocalStorage.setItem(INDEX_KEY, JSON.stringify(index));
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function generateTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) return "New Conversation";

  const content = firstUserMessage.content.trim();
  if (content.length <= 50) return content;
  return content.slice(0, 50) + "...";
}

async function getIndex(): Promise<ConversationIndexEntry[]> {
  const raw = await LocalStorage.getItem<string>(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ConversationIndexEntry[];
  } catch {
    console.error("[storage] Corrupted conversation index");
    return [];
  }
}
