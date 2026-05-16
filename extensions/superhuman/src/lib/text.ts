/**
 * Replace Markdown links with "label: url" so plain-text email bodies render
 * correctly when sent through Superhuman. Used by every tool that accepts
 * free-form body text.
 */
export function flattenMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => `${label}: ${url}`);
}

/**
 * Split a comma-separated string into a trimmed, non-empty array, or undefined
 * when the input is empty. Accepts arrays as-is for AI-tool inputs that may
 * already be structured.
 */
export function splitList(value?: string | string[]): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const cleaned = value.map((s) => s.trim()).filter(Boolean);
    return cleaned.length ? cleaned : undefined;
  }
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

/**
 * Normalize Superhuman search operators in a free-form query string so the
 * AI's natural-language phrasing maps onto the MCP server's expectations.
 */
export function formatSearchQuery(query: string): string {
  // Strip quotes around operator values: subject:"foo bar" -> subject:foo bar
  let q = query.replace(/(\w+):"([^"]+)"/g, "$1:$2");
  // "from John" -> "from:john"
  q = q.replace(/from\s+([^\s:]+)/gi, (_m, name) => `from:${name.toLowerCase()}`);
  // "subject foo" -> "subject:foo"
  q = q.replace(/subject\s+([^\s:]+)/gi, (_m, term) => `subject:${term}`);
  return q;
}

/**
 * Phrases that suggest a user is trying to compose mail rather than search.
 * Search tools surface a confirmation when these appear in a query so the AI
 * can re-route to draft-email.
 */
export const COMPOSE_PHRASES = [
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

export function looksLikeCompose(query: string): boolean {
  const lower = query.toLowerCase();
  return COMPOSE_PHRASES.some((p) => lower.includes(p));
}
