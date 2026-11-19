import { normalizeSearchText, tokenize } from "@lib/utils";

/** Item with the text used by the shared search matcher. */
export type SearchableItem = {
  searchText: string;
};

/**
 * Joins non-empty values into lowercase text for search.
 *
 * Each value is trimmed before it is joined.
 *
 * @param parts - Values that contribute to the searchable text.
 */
export function buildSearchText(...parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLowerCase();
}

/**
 * Builds a reusable matcher so the query is normalized and tokenized once.
 *
 * The matcher returns true when every query token appears in the item text.
 * An empty query matches every item.
 *
 * @param query - Raw search query.
 */
export function createSearchMatcher(query: string): (item: SearchableItem) => boolean {
  const normalized = normalizeSearchText(query);

  if (!normalized) {
    return () => true;
  }

  const tokens = tokenize(normalized);
  return (item) => tokens.every((token) => item.searchText.includes(token));
}

/** Tests one item against a query by creating a matcher for that query. */
export function querySearchText(item: SearchableItem, query: string): boolean {
  return createSearchMatcher(query)(item);
}
