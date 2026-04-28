/**
 * Generic search filter for OpenStack resources.
 *
 * Filters any list of items that have a `name` property by a
 * case-insensitive substring match.
 */

/**
 * Returns items whose `name` contains `query` (case-insensitive).
 * If `query` is empty or undefined, all items are returned.
 *
 * @param items - The full list of items to filter.
 * @param query - The search string entered by the user.
 * @returns A new array containing only the matching items.
 */
export function filterByName<T extends { name: string }>(items: T[], query: string): T[] {
  if (!query || query.length === 0) {
    return items;
  }

  const lowerQuery = query.toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(lowerQuery));
}
