import { nyxe } from "../lib/raycast";
import { REDACTED, REDACTED_SUBJECT, shouldWithhold } from "../lib/redact";

type Input = {
  /**
   * The thread id, exactly as returned by search-mail or list-inbox.
   */
  threadId: string;
};

/**
 * Read one email thread: every message, oldest first, with sender,
 * recipients, date and the body as plain text. Long bodies may be truncated
 * (`textTruncated`). Sign-in and verification emails come back with their
 * subject and body withheld.
 */
export default async function tool(input: Input) {
  const thread = await nyxe().thread(input.threadId);
  const messages = thread.messages.map((m) => {
    const withheld = shouldWithhold(m.isSignIn, m.subject, m.text);
    return {
      id: m.id,
      from: m.from,
      to: m.to,
      cc: m.cc,
      subject: withheld ? REDACTED_SUBJECT : m.subject,
      receivedAt: new Date(m.receivedAt).toISOString(),
      isUnread: m.isUnread,
      text: withheld ? REDACTED : m.text,
      textTruncated: m.textTruncated,
      attachments: m.attachments.map((a) => a.name ?? "attachment"),
    };
  });
  const anyWithheld = messages.some((m) => m.subject === REDACTED_SUBJECT);
  return {
    threadId: thread.threadId,
    subject: anyWithheld ? REDACTED_SUBJECT : thread.subject,
    messages,
  };
}
