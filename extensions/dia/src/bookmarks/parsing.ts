import { BookmarkParsedQuery } from "./types";

/**
 * Parses search query to extract include and exclude terms.
 * Filters items where the url and title match all space-separated words in search query (case insensitive).
 * Supports exclude terms with "-" prefix to filter out results containing those terms.
 * Use "\-" to search for literal "-" character.
 *
 * Examples:
 * - "foo bar" - Must contain both "foo" AND "bar"
 * - "foo -bar" - Must contain "foo" but NOT "bar"
 * - "\-foo" - Literal search for "-foo"
 */
export function parseBookmarkSearchQuery(query: string): BookmarkParsedQuery {
  if (!query) {
    return { includeTerms: [], excludeTerms: [] };
  }

  const terms = query.trim().split(/\s+/);
  const includeTerms: string[] = [];
  const excludeTerms: string[] = [];

  for (const term of terms) {
    if (term.startsWith("\\-") && term.length > 1) {
      // Escaped dash: remove the backslash and add to include terms
      includeTerms.push(term.slice(1).toLowerCase());
    } else if (term.startsWith("-") && term.length > 1) {
      // Remove the leading '-' and add to exclude terms
      excludeTerms.push(term.slice(1).toLowerCase());
    } else if (term.length > 0 && term !== "-") {
      // Add to include terms (ignore standalone '-')
      includeTerms.push(term.toLowerCase());
    }
  }

  return { includeTerms, excludeTerms };
}

/**
 * Checks if a text matches the parsed query criteria
 */
export function matchesBookmarkQuery(text: string, parsedQuery: BookmarkParsedQuery): boolean {
  const { includeTerms, excludeTerms } = parsedQuery;

  const hasAllIncludeTerms = includeTerms.length === 0 || includeTerms.every((term) => text.includes(term));

  const hasNoExcludeTerms = excludeTerms.length === 0 || !excludeTerms.some((term) => text.includes(term));

  return hasAllIncludeTerms && hasNoExcludeTerms;
}
