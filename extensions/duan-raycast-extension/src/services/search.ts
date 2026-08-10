import type { Link } from "../types";

/**
 * Search links by multiple fields (short_code, original_url, description)
 * Supports partial matching and case-insensitive search
 *
 * @param links - Array of links to search through
 * @param searchText - Search query text
 * @returns Filtered array of links that match the search criteria
 */
export const searchLinks = (links: Link[], searchText: string): Link[] => {
  if (!searchText.trim()) {
    return links;
  }

  const normalizedSearch = searchText.toLowerCase();

  return links.filter((link) => {
    const matchShortCode = link.short_code.toLowerCase().includes(normalizedSearch);
    const matchUrl = link.original_url.toLowerCase().includes(normalizedSearch);
    const matchDescription = link.description?.toLowerCase().includes(normalizedSearch) ?? false;

    return matchShortCode || matchUrl || matchDescription;
  });
};
