import { nyxe } from "../lib/raycast";
import { REDACTED, REDACTED_SUBJECT, shouldWithhold } from "../lib/redact";

type Input = {
  /**
   * What to search for: words from the subject or body, a sender's name or
   * address, or a mix ("invoice from stripe"). Plain words, no operators.
   */
  query: string;
  /**
   * How many threads to return, 1 to 30. Defaults to 10.
   */
  limit?: number;
};

/**
 * Search the user's Nyxe mailbox. Returns matching threads, newest first,
 * with the sender, subject, a short preview and the thread id to pass to
 * get-thread. Trash and Junk are not searched. Previews of sign-in and
 * verification emails are withheld.
 */
export default async function tool(input: Input) {
  const limit = Math.max(1, Math.min(input.limit ?? 10, 30));
  const page = await nyxe().search(input.query, { limit });
  return {
    results: page.results.map((r) =>
      shouldWithhold(r.isSignIn, r.subject, r.preview) ? { ...r, subject: REDACTED_SUBJECT, preview: REDACTED } : r,
    ),
    total: page.total,
  };
}
