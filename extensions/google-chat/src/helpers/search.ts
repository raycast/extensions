/** Builds `spaces.messages.search` filters. Pure: no Raycast imports. */

export type SearchMode = "all" | "unread" | "mentions" | "links";

function quote(term: string): string {
  return `"${term.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Filter for `POST /v1/spaces/-/messages:search`. Each word becomes a quoted keyword (implicit AND).
 * With no words, falls back to messages from the last `recentDays` days, because the filter is required.
 * Grammar per the discovery doc: `is_unread()`, `has_link()`,
 * `annotations.user_mentions.user.name:users/me`, `create_time >= "RFC3339"`. The server caps queries at 1,000 characters.
 */
export function buildSearchFilter(
  query: string,
  mode: SearchMode | SearchMode[],
  now: Date = new Date(),
  recentDays = 7,
): string {
  const modes = new Set(Array.isArray(mode) ? mode : [mode]);
  const words = query.trim().split(/\s+/).filter(Boolean).slice(0, 20).map(quote);
  const parts = [...words];
  if (modes.has("unread")) parts.push("is_unread()");
  if (modes.has("mentions")) parts.push("annotations.user_mentions.user.name:users/me");
  if (modes.has("links")) parts.push("has_link()");
  if (words.length === 0) {
    const since = new Date(now.getTime() - recentDays * 24 * 60 * 60 * 1000).toISOString();
    parts.push(`create_time >= "${since}"`);
  }
  return parts.join(" AND ");
}

/** Search pagination cursor: the next page token and the filter the search started with. */
export interface SearchCursor {
  filter: string;
  pageToken: string;
}

/**
 * The filter for one page of a search. The first page builds it; later pages reuse the one in their cursor,
 * because Google rejects a `pageToken` sent with a different filter (and a filter without keywords holds the
 * time it was built).
 */
export function searchPageFilter(
  query: string,
  mode: SearchMode,
  cursor?: SearchCursor,
  now: Date = new Date(),
): string {
  return cursor?.filter ?? buildSearchFilter(query, mode, now);
}
