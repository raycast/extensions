import { Chat, Message } from "../types";

/**
 * Transform Chat array to Message array for API calls
 * Each Chat (Q&A pair) becomes two messages: user question + assistant answer
 */
export function chatsToMessages(chats: Chat[]): Message[] {
  const messages: Message[] = [];

  chats.forEach((chat) => {
    messages.push({ role: "user", content: chat.question });
    messages.push({ role: "assistant", content: chat.answer });
  });

  return messages;
}

/**
 * Limit conversation length to avoid token limits
 * Keeps only the most recent chats
 * @param chats - Array of chat exchanges
 * @param maxChats - Maximum number of chats to keep (default: 25)
 * @returns Limited array of most recent chats
 */
export function limitConversationLength(chats: Chat[], maxChats: number = 25): Chat[] {
  if (chats.length <= maxChats) {
    return chats;
  }
  // Keep most recent chats by slicing from the end
  return chats.slice(-maxChats);
}
