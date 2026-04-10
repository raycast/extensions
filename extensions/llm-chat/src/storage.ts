import { LocalStorage } from "@raycast/api";

export interface Conversation {
  id: string;
  provider: string;
  model: string;
  messages: { role: string; content: string; reasoning?: string }[];
  createdAt: number;
}

const HISTORY_KEY = "llm-chat-history";

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function saveConversation(conv: Conversation): Promise<void> {
  try {
    const existing = await getHistory();
    const deduped = existing.filter((conversation) => conversation.id !== conv.id);
    const trimmed = [conv, ...deduped].slice(0, 50);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error("Failed to save conversation:", err);
  }
}

export async function getHistory(): Promise<Conversation[]> {
  try {
    const data = await LocalStorage.getItem<string>(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function deleteConversation(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((c) => c.id !== id);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.setItem(HISTORY_KEY, "[]");
}
