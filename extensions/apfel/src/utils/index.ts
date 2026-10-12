import { Chat, Message } from "../type";

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

// The text goes inside single quotes in a shell command, which is itself inside an AppleScript string
// (`do shell script "..."`). Escape for the shell first (' becomes '\'' ), then for AppleScript (\ and ").
export const escapeForShell = (s: string) => s.replace(/'/g, "'\\''").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
