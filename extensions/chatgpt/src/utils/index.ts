import { Chat, Message } from "../type";

export function chatTransfomer(chat: Chat[], prompt: string): Message[] {
  const messages: Message[] = [{ role: "system", content: prompt }];
  chat.forEach(({ question, answer }) => {
    messages.push({ role: "user", content: question });
    messages.push({
      role: "assistant",
      content: answer,
    });
  });
  return messages;
}
