import { Chat, Message } from "../type";

export function chatTransformer(chat: Chat[]): Message[] {
  return chat.flatMap(({ question, answer }) => [
    { role: "user", content: question },
    ...(answer ? [{ role: "assistant", content: answer }] : []),
  ]);
}
