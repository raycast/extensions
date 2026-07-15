import type { Conversation } from "../types";

export function formatConversationToMarkdown(conversation: Conversation): string {
  return conversation.messages
    .map((msg) => (msg.role === "user" ? `# ${msg.content}\n\n` : `${msg.content}\n\n---\n\n`))
    .join("");
}

export function formatConversationForCopy(conversation: Conversation): string {
  return conversation.messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
}
