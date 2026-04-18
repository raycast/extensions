import { LocalStorage } from "@raycast/api";
import type {
  Conversation,
  ConversationSummary,
  SystemPromptItem,
} from "../types";

const INDEX_KEY = "conversations_index";
const CONV_PREFIX = "conversation_";
const PROMPTS_KEY = "custom_system_prompts";
const MAX_CONVERSATIONS = 100;
const MAX_MESSAGES = 200;

// --- Conversations ---

export async function getConversationIndex(): Promise<ConversationSummary[]> {
  const raw = await LocalStorage.getItem<string>(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function getConversation(
  id: string,
): Promise<Conversation | null> {
  const raw = await LocalStorage.getItem<string>(`${CONV_PREFIX}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveConversation(
  conversation: Conversation,
): Promise<void> {
  await LocalStorage.setItem(
    `${CONV_PREFIX}${conversation.id}`,
    JSON.stringify(conversation),
  );

  const index = await getConversationIndex();
  const existing = index.findIndex((c) => c.id === conversation.id);
  const summary: ConversationSummary = {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    messageCount: conversation.messages.length,
    updatedAt: conversation.updatedAt,
  };

  if (existing >= 0) {
    index[existing] = summary;
  } else {
    index.unshift(summary);
  }

  index.sort((a, b) => b.updatedAt - a.updatedAt);

  if (index.length > MAX_CONVERSATIONS) {
    const removed = index.splice(MAX_CONVERSATIONS);
    for (const r of removed) {
      await LocalStorage.removeItem(`${CONV_PREFIX}${r.id}`);
    }
  }

  await LocalStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export async function deleteConversation(id: string): Promise<void> {
  await LocalStorage.removeItem(`${CONV_PREFIX}${id}`);
  const index = await getConversationIndex();
  const filtered = index.filter((c) => c.id !== id);
  await LocalStorage.setItem(INDEX_KEY, JSON.stringify(filtered));
}

export async function renameConversation(
  id: string,
  title: string,
): Promise<void> {
  const conversation = await getConversation(id);
  if (!conversation) return;
  conversation.title = title;
  conversation.updatedAt = Date.now();
  await saveConversation(conversation);
}

export async function clearAllConversations(): Promise<void> {
  const index = await getConversationIndex();
  for (const c of index) {
    await LocalStorage.removeItem(`${CONV_PREFIX}${c.id}`);
  }
  await LocalStorage.removeItem(INDEX_KEY);
}

export function isAtMessageLimit(conversation: Conversation): boolean {
  return conversation.messages.length >= MAX_MESSAGES;
}

// --- Custom System Prompts ---

export async function getCustomPrompts(): Promise<SystemPromptItem[]> {
  const raw = await LocalStorage.getItem<string>(PROMPTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCustomPrompt(
  prompt: SystemPromptItem,
): Promise<void> {
  const prompts = await getCustomPrompts();
  const existing = prompts.findIndex((p) => p.id === prompt.id);
  if (existing >= 0) {
    prompts[existing] = prompt;
  } else {
    prompts.push(prompt);
  }
  await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
}

export async function deleteCustomPrompt(id: string): Promise<void> {
  const prompts = await getCustomPrompts();
  const filtered = prompts.filter((p) => p.id !== id);
  await LocalStorage.setItem(PROMPTS_KEY, JSON.stringify(filtered));
}
