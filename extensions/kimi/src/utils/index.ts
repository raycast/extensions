import { Chat, Message } from "../type";

export function chatTransformer(chat: Chat[]): Message[] {
  return chat.flatMap(({ question, answer }) => [
    { role: "user" as const, content: question },
    ...(answer ? [{ role: "assistant" as const, content: answer }] : []),
  ]);
}
