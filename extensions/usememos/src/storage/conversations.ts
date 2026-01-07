import { LocalStorage } from "@raycast/api";
import { ChatMessage } from "./api/openai";

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

const CONVERSATIONS_KEY = "ai_conversations";
const MAX_CONVERSATIONS = 50;

export async function getConversations(): Promise<Conversation[]> {
  const data = await LocalStorage.getItem<string>(CONVERSATIONS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as Conversation[];
  } catch {
    return [];
  }
}

export async function getConversation(
  id: string,
): Promise<Conversation | null> {
  const conversations = await getConversations();
  return conversations.find((c) => c.id === id) || null;
}

export async function saveConversation(
  conversation: Conversation,
): Promise<void> {
  const conversations = await getConversations();
  const existingIndex = conversations.findIndex(
    (c) => c.id === conversation.id,
  );

  if (existingIndex >= 0) {
    conversations[existingIndex] = conversation;
  } else {
    conversations.unshift(conversation);
  }

  // Keep only the most recent conversations
  const trimmed = conversations.slice(0, MAX_CONVERSATIONS);
  await LocalStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(trimmed));
}

export async function deleteConversation(id: string): Promise<void> {
  const conversations = await getConversations();
  const filtered = conversations.filter((c) => c.id !== id);
  await LocalStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(filtered));
}

export async function createConversation(): Promise<Conversation> {
  const conversation: Conversation = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    title: "New Conversation",
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveConversation(conversation);
  return conversation;
}

export function generateTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) return "New Conversation";

  const content = firstUserMessage.content;
  if (content.length <= 40) return content;
  return content.slice(0, 37) + "...";
}
