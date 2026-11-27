import type { ChatMessage } from "./chat-completions";
import type { Conversation, Message, MessageStatus } from "../types";

let messageCounter = 0;
let conversationCounter = 0;

export function createMessage(
  role: Message["role"],
  content: string,
  modelName?: string,
  status?: MessageStatus,
): Message {
  messageCounter += 1;
  return {
    id: `m-${Date.now()}-${messageCounter}`,
    role,
    content,
    createdAt: Date.now(),
    modelName,
    status,
  };
}

export function createConversation(): Conversation {
  conversationCounter += 1;
  const now = Date.now();
  return {
    id: `c-${now}-${conversationCounter}`,
    title: "New Conversation",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function titleFromPrompt(prompt: string): string {
  return prompt.replace(/\s+/g, " ").trim().slice(0, 30) || "New Conversation";
}

export function toChatMessages(messages: Message[]): ChatMessage[] {
  return messages
    .filter((message) => {
      if (message.content.trim().length === 0) {
        return false;
      }
      if (message.role === "user") {
        return true;
      }
      return message.status === "done";
    })
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

export function findLastTurn(messages: Message[]): { userIndex: number; assistantIndex: number } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== "assistant") {
      continue;
    }
    for (let j = i - 1; j >= 0; j--) {
      if (messages[j].role === "user") {
        return { userIndex: j, assistantIndex: i };
      }
    }
    return null;
  }
  return null;
}

export function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function hasStreamingMessages(conversations: Conversation[]): boolean {
  return conversations.some((conversation) => conversation.messages.some((message) => message.status === "streaming"));
}

export function repairInterruptedMessages(conversations: Conversation[]): Conversation[] {
  return conversations.map((conversation) => ({
    ...conversation,
    messages: conversation.messages.map((message) =>
      message.status === "streaming" ? { ...message, status: "interrupted" as const } : message,
    ),
  }));
}
