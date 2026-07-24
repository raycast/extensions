// Case-insensitive, whitespace-tokenized AND match: every term in `query` must
// appear somewhere in `haystack`. Used when a view does its own filtering
// (List `filtering={false}`) so search covers the full in-memory dataset rather
// than only the currently-paginated rows.
export function matchesQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = haystack.toLowerCase();
  return q.split(/\s+/).every((term) => hay.includes(term));
}
