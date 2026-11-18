import { searchMessages } from "../api/search-messages";

type Input = {
  /**
   * The search query compared against the email subject and content.
   *
   * Supports regular expressions.
   */
  search?: string;

  /**
   * Filter emails sent before the given date.
   *
   * Date must be in the format "YYYY-MM-DD HH:mm".
   */
  before?: string;

  /**
   * Filter emails sent after the given date.
   *
   * Date must be in the format "YYYY-MM-DD HH:mm".
   */
  after?: string;

  /**
   * Filter emails sent from the given email address.
   *
   * You can use the `list-addresses` tool to get a list of email addresses.
   */
  from?: string;

  /** Restrict results to the Inbox across all accounts. */
  mailbox?: string;

  /**
   * Limit the number of results returned.
   *
   * Maximum is 50.
   *
   * @default 25
   */
  limit?: number;

  /**
   * Number of matching emails to skip. Use the previous page's result count to request the next page.
   *
   * @default 0
   */
  offset?: number;

  /**
   * Sort the results in ascending or descending order by date received.
   *
   * @default "desc"
   */
  order?: "asc" | "desc";

  /**
   * Include emails from Trash in the search results.
   *
   * By default, emails in Trash are excluded.
   *
   * @default false
   */
  includeTrash?: boolean;
};

/**
 * Use mailbox "inbox" to restrict results to Inbox messages across accounts. Use offset to fetch another page when a result page is full. Try multiple queries with different keywords if your first attempt doesn't succeed. For example,
 * when looking for a meeting with John Smith, search separately for "meeting", "john smith", and "john".
 *
 * IMPORTANT: Always try at least 2-3 different search terms before concluding the
 * email can't be found. If specific searches fail, try broader terms related to the
 * content you're seeking.
 */
export default async function (input: Input) {
  if (input.mailbox && input.mailbox !== "inbox") {
    throw new Error('Only the "inbox" mailbox filter is currently supported');
  }

  const messages = await searchMessages({ ...input, mailbox: input.mailbox ? "inbox" : undefined });
  return messages;
}
