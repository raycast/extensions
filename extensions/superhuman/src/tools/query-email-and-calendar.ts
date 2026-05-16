import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";
import { formatSearchQuery, looksLikeCompose } from "../lib/text";
import { QueryEmailAndCalendarInput, validate } from "../lib/validation";

/**
 * Flagship cross-source query. Reasons across email + calendar + contacts
 * in a single natural-language request. Wraps Superhuman's semantic search
 * endpoint (`query_email_and_calendar`).
 *
 * Supports the standard Superhuman search operators alongside free-text:
 *   from:nicole, to:roman, subject:lunch, has:attachment,
 *   in:inbox / in:sent / in:<label>, is:unread / is:starred / is:shared,
 *   before:YYYY/MM/DD, after:YYYY/MM/DD, older_than:Xd, newer_than:Xm.
 */
type Input = {
  /** Natural-language question or Superhuman-operator query. */
  query: string;
};

interface SearchResult {
  results?: unknown[];
  threads?: unknown[];
  events?: unknown[];
  total?: number;
  message?: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!looksLikeCompose(input.query)) return undefined;
  return {
    message: `⚠️ "${input.query}" looks like composing, not searching. This tool only finds existing email and calendar items — use draft-email to compose. Confirm to search anyway.`,
    image: "⚠️",
  };
};

export default async function tool(input: Input): Promise<SearchResult | string> {
  const parsed = validate(QueryEmailAndCalendarInput, input);
  const query = formatSearchQuery(parsed.query);
  const result = await callMcpTool<SearchResult>("query_email_and_calendar", { query });
  return result ?? `Searched for "${query}" in Superhuman.`;
}
