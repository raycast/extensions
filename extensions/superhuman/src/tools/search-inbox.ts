import { open } from "@raycast/api";
import { Tool } from "@raycast/api";

/**
 * Common phrases that indicate someone might be trying to compose an email
 * rather than search for existing emails
 */
const COMPOSE_PHRASES = [
  "email to",
  "send email",
  "write to",
  "draft",
  "compose",
  "new email",
  "message to",
  "write email",
  "send a message",
  "send message",
];

/**
 * Input parameters for the search-inbox tool
 * This tool is ONLY for searching existing emails in Superhuman.
 * For composing new emails, use the draft-email tool instead.
 */
type Input = {
  /**
   * Search query to find in Superhuman
   * This is used for searching emails, not for composing new ones.
   * You can use search operators like:
   *
   * - from:nicole → from Nicole
   * - to:roman → to Roman
   * - "be brilliant" → contains "be brilliant"
   * - has:attachment → with attachments
   * - subject:lunch → subject contains "lunch"
   * - in:sent → in Sent
   * - in:inbox → in the Inbox
   * - -in:inbox → not in the Inbox
   * - in:fundraising → in this label
   * - is:unread → unread conversations
   * - is:starred → starred conversations
   * - is:shared → shared conversations
   * - before:2017/06/01 → before June 2017
   * - after:2017/06/01 → June 2017 or later
   * - older_than:3d → more than 3 days ago
   * - newer_than:1m → 1 month ago or later
   *
   */
  query: string;
};

/**
 * Format the search query properly according to Superhuman search syntax
 * @param query The user's search query
 * @returns A properly formatted search query
 */
function formatSearchQuery(query: string): string {
  // Remove any quotation marks around operator values to match test expectations
  query = query.replace(/(\w+):"([^"]+)"/g, "$1:$2");

  // Ensure "from name" is properly formatted as "from:name"
  query = query.replace(/from\s+([^\s:]+)/gi, (match, name) => {
    return `from:${name.toLowerCase()}`;
  });

  // Handle "subject name" to "subject:name"
  query = query.replace(/subject\s+([^\s:]+)/gi, (match, term) => {
    return `subject:${term}`;
  });

  return query;
}

/**
 * Optional confirmation before searching inbox
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Detect potential misuse - when search query looks like it's trying to compose
  const searchLooksLikeCompose = COMPOSE_PHRASES.some((phrase) =>
    input.query.toLowerCase().includes(phrase.toLowerCase()),
  );

  if (searchLooksLikeCompose) {
    return {
      message: `⚠️ Warning: Your query "${input.query}" looks like you want to compose an email, not search. 
The search-inbox tool is ONLY for finding existing emails. 
To compose a new email, please use the draft-email tool instead.

If you really want to search for this term, please confirm.`,
      image: "⚠️",
    };
  }

  // Format the query for better search results
  const formattedQuery = formatSearchQuery(input.query);
  if (formattedQuery !== input.query) {
    input.query = formattedQuery;
    console.log(`Reformatted search query to: ${formattedQuery}`);
  }

  return {
    message: `Searching for: ${input.query}`,
    image: "🔍",
  };
};

/**
 * Searches in Superhuman using deeplinks
 * Note: This tool is ONLY for searching emails, not for sending/composing
 */
export default async function tool(input: Input): Promise<string> {
  try {
    console.log(`Searching in Superhuman`);

    // Look for potential misuse where someone is trying to compose
    const searchLooksLikeCompose = COMPOSE_PHRASES.some((phrase) =>
      input.query.toLowerCase().includes(phrase.toLowerCase()),
    );

    if (searchLooksLikeCompose) {
      console.warn("Warning: Search query looks like it's trying to compose an email");
      console.warn("This tool should only be used for searching existing emails");
      // Continue anyway as user confirmed in the confirmation dialog
    }

    // Format the query for better search results
    input.query = formatSearchQuery(input.query);

    const url = `superhuman://search/${encodeURIComponent(input.query)}`;

    console.log(`Opening Superhuman search with URL: ${url}`);
    await open(url);

    return `Searched for "${input.query}" in Superhuman`;
  } catch (error) {
    console.error("Failed to search:", error);
    return `Failed to search: ${String(error)}. If this issue persists, please verify that Superhuman is properly installed and configured on your system.`;
  }
}
