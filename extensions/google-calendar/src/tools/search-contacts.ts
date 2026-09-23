import { withCache } from "@raycast/utils";
import { searchContacts, withGoogleAPIs } from "../lib/google";

type Input = {
  /**
   * Search query to find matching contacts
   *
   * @description
   * Text to search for in contact names and email addresses. The search matches from the beginning
   * of words (prefix matching). For example:
   * - "john" matches "John Smith" or "Johnson"
   * - "sm" matches "Smith" or "Smart"
   * - "jo sm" matches "John Smith"
   *
   * @example
   * "john" - Find contacts with names starting with "John"
   * "sm" - Find contacts with names containing words starting with "Sm"
   *
   * @constraints
   * - Must be non-empty string
   * - Matches are case-insensitive
   * - Partial word matches only work from the start of words
   */
  query: string;
};

const cachedSearchContacts = withCache(
  async (query: string) => {
    const contacts = await searchContacts(query);
    return contacts.map((contact) => ({
      name: contact.names?.[0]?.displayName,
      email: contact.emailAddresses?.[0]?.value,
    }));
  },
  {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    validate(data) {
      return data.length > 0; // Retry empty results rather than treating them as valid cached data
    },
  },
);

const tool = async (input: Input) => {
  return await cachedSearchContacts(input.query);
};

export default withGoogleAPIs(tool);
