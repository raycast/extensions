import type { ChatTurn } from "./operations";
import type { ChatMessage } from "./types";

export const DEFAULT_CHAT_INSTRUCTIONS =
  "You are a helpful assistant running privately on the user's Mac. Answer concisely in Markdown.";

const IMAGE_ATTACHED_SUFFIX = " [image attached]";
const LAST_MESSAGE_RULE = " Reply only to the last message from User.";

export function buildChatInstructions(custom: string): string {
  return (custom.trim() || DEFAULT_CHAT_INSTRUCTIONS) + LAST_MESSAGE_RULE;
}

export function replayContent(message: Pick<ChatMessage, "content" | "imagePath">): string {
  return message.imagePath ? message.content + IMAGE_ATTACHED_SUFFIX : message.content;
}

export function buildChatStdin(history: ChatTurn[], newMessage: string): string {
  if (history.length === 0) return newMessage;
  const lines = history.flatMap((turn) => [
    `User: ${replayContent(turn.user)}`,
    ...(turn.assistant ? [`Assistant: ${replayContent(turn.assistant)}`] : []),
  ]);
  return `Conversation so far:\n${lines.join("\n")}\n\nNew message from User:\n${newMessage}`;
}
