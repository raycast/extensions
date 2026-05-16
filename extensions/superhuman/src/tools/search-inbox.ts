import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";

/**
 * Phrases that suggest the user is trying to compose an email instead of search.
 * When detected, we surface a confirmation so the AI can re-route to draft-email.
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
 * Input parameters for the search-inbox tool.
 * This tool searches existing email and calendar via Superhuman's MCP `query_email_and_calendar`.
 * It is NOT for composing — for that, use draft-email.
 *
 * Supports Superhuman search operators:
 * - from:nicole, to:roman
 * - subject:lunch (no quotes around the value)
 * - "exact phrase"
 * - has:attachment
 * - in:sent, in:inbox, -in:inbox, in:<label>
 * - is:unread, is:starred, is:shared
 * - before:YYYY/MM/DD, after:YYYY/MM/DD
 * - older_than:Xd, newer_than:Xm
 */
type Input = {
  /**
   * The search query string with Superhuman operators (e.g. "from:john subject:budget").
   */
  query: string;
};

function formatSearchQuery(query: string): string {
  // Strip quotes around operator values: subject:"foo bar" -> subject:foo bar
  query = query.replace(/(\w+):"([^"]+)"/g, "$1:$2");
  // "from John" -> "from:john"
  query = query.replace(/from\s+([^\s:]+)/gi, (_m, name) => `from:${name.toLowerCase()}`);
  // "subject foo" -> "subject:foo"
  query = query.replace(/subject\s+([^\s:]+)/gi, (_m, term) => `subject:${term}`);
  return query;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const looksLikeCompose = COMPOSE_PHRASES.some((p) => input.query.toLowerCase().includes(p));
  if (looksLikeCompose) {
    return {
      message: `⚠️ "${input.query}" looks like composing, not searching. The search-inbox tool only finds existing email. Use draft-email to compose. Confirm to search anyway.`,
      image: "⚠️",
    };
  }
  return undefined;
};

interface SearchResult {
  results?: unknown[];
  threads?: unknown[];
  events?: unknown[];
  total?: number;
  message?: string;
}

export default async function tool(input: Input): Promise<SearchResult | string> {
  const query = formatSearchQuery(input.query);
  const result = await callMcpTool<SearchResult>("query_email_and_calendar", { query });
  // Pass the structured result straight through so the AI can read individual hits.
  return result ?? `Searched for "${query}" in Superhuman.`;
}
