import { LocalStorage } from "@raycast/api";
import { Message } from "../providers/base";

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const CONVERSATIONS_KEY = "conversations";
const CURRENT_CONVERSATION_KEY = "current_conversation";

export async function getConversations(): Promise<Conversation[]> {
  const data = await LocalStorage.getItem<string>(CONVERSATIONS_KEY);
  if (!data) return [];

  try {
    const conversations = JSON.parse(data) as Conversation[];
    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const conversations = await getConversations();
  return conversations.find((c) => c.id === id) ?? null;
}

export async function saveConversation(conversation: Conversation): Promise<void> {
  const conversations = await getConversations();
  const index = conversations.findIndex((c) => c.id === conversation.id);

  if (index >= 0) {
    conversations[index] = conversation;
  } else {
    conversations.push(conversation);
  }

  await LocalStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
}

export async function deleteConversation(id: string): Promise<void> {
  const conversations = await getConversations();
  const filtered = conversations.filter((c) => c.id !== id);
  await LocalStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(filtered));
}

export async function getCurrentConversationId(): Promise<string | null> {
  const id = await LocalStorage.getItem<string>(CURRENT_CONVERSATION_KEY);
  return id ?? null;
}

export async function setCurrentConversationId(id: string | null): Promise<void> {
  if (id) {
    await LocalStorage.setItem(CURRENT_CONVERSATION_KEY, id);
  } else {
    await LocalStorage.removeItem(CURRENT_CONVERSATION_KEY);
  }
}

export function createConversation(firstMessage?: string): Conversation {
  const now = Date.now();
  return {
    id: `conv_${now}_${Math.random().toString(36).slice(2, 9)}`,
    title: firstMessage ? firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "") : "New Conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function generateTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) return "New Conversation";

  const content = firstUserMessage.content;
  return content.slice(0, 50) + (content.length > 50 ? "..." : "");
}

export function exportConversation(conversation: Conversation): string {
  let output = `# ${conversation.title}\n\n`;
  output += `Created: ${new Date(conversation.createdAt).toLocaleString()}\n\n`;
  output += "---\n\n";

  for (const message of conversation.messages) {
    const role = message.role === "user" ? "**You**" : "**AI**";
    output += `${role}:\n\n${message.content}\n\n---\n\n`;
  }

  return output;
}
