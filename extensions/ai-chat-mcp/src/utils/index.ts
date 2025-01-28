import { Chat, ApiMessage } from "../type";

export function chatTransformer(chats: Chat[]): ApiMessage[] {
  return chats.flatMap((chat) => {
    return chat.messages
      .filter((msg) => msg.type === "user" || msg.type === "assistant")
      .map((msg) => ({
        role: msg.type as "user" | "assistant",
        content: msg.content,
      }));
  });
}
