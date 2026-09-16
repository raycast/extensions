import type { ChatSession } from "./types";

export function interruptStaleStreamingMessages(
  session: ChatSession,
): ChatSession {
  if (!session.messages.some((message) => message.status === "streaming"))
    return session;

  return {
    ...session,
    messages: session.messages.map((message) =>
      message.status === "streaming"
        ? { ...message, status: "interrupted" as const }
        : message,
    ),
  };
}
