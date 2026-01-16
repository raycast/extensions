/**
 * Simple, low-latency substring search utility
 * Performs case-insensitive multi-word matching on title and URL fields
 *
 * Multi-word matching: Query is split by whitespace, all words must match
 * Order-independent: "foo bar" and "bar foo" both match
 */

export interface Searchable {
  title?: string;
  url: string;
}

/**
 * Filters an array of searchable items using multi-word substring matching
 * @param items - Array of items to filter
 * @param query - Search query string (space-separated words)
 * @returns Filtered array
 */
export function filterSearchable<T extends Searchable>(items: T[], query: string): T[] {
  if (!query) return items;

  // Split query into words and convert to lowercase
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return items;

  return items.filter((item) => {
    const lowerTitle = item.title?.toLowerCase();
    const lowerUrl = item.url.toLowerCase();

    // All words must match (found in either title or URL)
    return words.every((word) => (lowerTitle && lowerTitle.includes(word)) || lowerUrl.includes(word));
  });
}
