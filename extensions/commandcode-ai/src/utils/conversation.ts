import type { Conversation } from "../types";

export function formatConversationForCopy(conversation: Conversation): string {
  return conversation.messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
}
