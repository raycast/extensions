import { searchMessages } from "../api/search-messages";

type Input = {
  /**
   * The search query compared against the email subject and content.
   *
   * Supports regular expressions.
   *
   * If you can't find the email you're looking for, try performing multiple
   * searches with different keywords.
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

  /**
   * Limit the number of results returned.
   *
   * @default 25
   */
  limit?: number;

  /**
   * Sort the results in ascending or descending order by date received.
   *
   * @default "desc"
   */
  order?: "asc" | "desc";
};

export default async function (input: Input) {
  const messages = await searchMessages(input);
  return messages;
}
