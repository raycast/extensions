import { nyxe } from "../lib/raycast";
import { REDACTED, REDACTED_SUBJECT, shouldWithhold } from "../lib/redact";

type Input = {
  /**
   * Only threads with unread mail. Defaults to false (every inbox thread).
   */
  unreadOnly?: boolean;
  /**
   * How many threads to return, 1 to 30. Defaults to 15.
   */
  limit?: number;
};

/**
 * List the newest threads in the user's inbox: subject, sender, a preview,
 * whether it is unread, and the thread id to pass to get-thread.
 */
export default async function tool(input: Input) {
  const limit = Math.max(1, Math.min(input.limit ?? 15, 30));
  const page = await nyxe().inbox({ unread: input.unreadOnly ?? false, limit });
  return {
    threads: page.threads.map((t) => {
      const withheld = shouldWithhold(t.isSignIn, t.subject, t.lastMessage.preview);
      return {
        threadId: t.threadId,
        subject: withheld ? REDACTED_SUBJECT : t.subject,
        messageCount: t.messageCount,
        from: t.lastMessage.from,
        preview: withheld ? REDACTED : t.lastMessage.preview,
        receivedAt: new Date(t.lastMessage.receivedAt).toISOString(),
        isUnread: t.lastMessage.isUnread,
        hasAttachment: t.lastMessage.hasAttachment,
      };
    }),
    hasMore: page.nextCursor !== null,
  };
}
