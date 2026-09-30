import { Chat, Message } from "../type";

/**
 * Orders a transcript oldest-first by `created_at`.
 *
 * Array position is not a reliable ordering for stored chats, so anything order-sensitive
 * establishes chronological order itself rather than trusting the array it was handed.
 * Sending a conversation to the API out of order feeds Claude the discussion backwards.
 */
export function toChronological(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
}

export function chatTransformer(chat: Chat[]): Message[] {
  const messages: Message[] = [];
  chat.forEach(({ question, answer }) => {
    messages.push({ role: "user", content: question });
    messages.push({
      role: "assistant",
      content: answer,
    });
  });
  return messages;
}
