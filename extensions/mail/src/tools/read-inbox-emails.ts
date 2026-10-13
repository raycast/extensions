import { searchMessages } from "../api/search-messages";

type Input = {
  /** Optional regular expression matched against message subject and body. */
  search?: string;
  /** Only include messages sent before this date, formatted as YYYY-MM-DD HH:mm. */
  before?: string;
  /** Only include messages sent after this date, formatted as YYYY-MM-DD HH:mm. */
  after?: string;
  /** Only include messages from this sender address. */
  from?: string;
  /** Messages to return per call. Maximum is 10; use nextOffset to continue. Defaults to 5. */
  limit?: number;
  /** Number of matching Inbox messages to skip. Continue with nextOffset while hasMore is true. */
  offset?: number;
};

const MAX_PAGE_SIZE = 10;
const MAX_MESSAGE_TEXT_LENGTH = 4000;

export default async function (input: Input) {
  const limit = input.limit ?? 5;
  const offset = input.offset ?? 0;

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new Error(`Limit must be an integer between 1 and ${MAX_PAGE_SIZE}`);
  }

  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000) {
    throw new Error("Offset must be an integer between 0 and 10000");
  }

  const results = await searchMessages({
    ...input,
    mailbox: "inbox",
    includeTrash: false,
    includeBody: true,
    limit: limit + 1,
    offset,
  });
  const hasMore = results.length > limit;
  const page = results.slice(0, limit);
  const messages = page.map(({ id, from, subject, text = "" }) => {
    const trimmedText =
      text.length > MAX_MESSAGE_TEXT_LENGTH ? `${text.slice(0, MAX_MESSAGE_TEXT_LENGTH)}\n... [truncated]` : text;
    return { id, from, subject, text: trimmedText };
  });

  return {
    mailbox: "inbox",
    offset,
    limit,
    hasMore,
    nextOffset: hasMore ? offset + page.length : null,
    messages,
  };
}
