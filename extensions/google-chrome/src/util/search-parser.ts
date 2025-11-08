/**
 * Parses search query to extract include and exclude terms.
 * Filters items where the url and title match all space-separated words in search query (case insensitive).
 * Supports exclude terms with "-" prefix to filter out results containing those terms.
 * Use "\-" to search for literal "-" character.
 *
 * @param query - The search query string
 * @returns Object containing include and exclude terms
 *
 * @example
 * parseSearchQuery("foo bar -baz")
 * // returns { includeTerms: ["foo", "bar"], excludeTerms: ["baz"] }
 *
 * parseSearchQuery("hello -world -test")
 * // returns { includeTerms: ["hello"], excludeTerms: ["world", "test"] }
 *
 * parseSearchQuery("foo \\-bar")
 * // returns { includeTerms: ["foo", "-bar"], excludeTerms: [] }
 *
 * @example Given an item with title "foo bar" and url "example.com":
 * - search "foo bar" succeeds (contains both foo and bar)
 * - search "bar foo" succeeds (order doesn't matter)
 * - search "foo example" succeeds (matches title and url)
 * - search "example foo" succeeds (matches url and title)
 * - search "foo" succeeds (partial match)
 * - search "example" succeeds (matches url)
 * - search "foo -bar" succeeds (contains foo but not bar)
 * - search "-example" fails (excludes example.com)
 * - search "asdf" fails (no match)
 * - search "\\-foo" succeeds for items containing literal "-foo"
 */
export interface ParsedQuery {
  includeTerms: string[];
  excludeTerms: string[];
}

export function parseSearchQuery(query: string): ParsedQuery {
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
 * @param text - The text to search in (should be lowercase)
 * @param parsedQuery - The parsed query object
 * @returns true if text matches criteria (contains all include terms and none of exclude terms)
 */
export function matchesQuery(text: string, parsedQuery: ParsedQuery): boolean {
  const { includeTerms, excludeTerms } = parsedQuery;

  const hasAllIncludeTerms = includeTerms.length === 0 || includeTerms.every((term) => text.includes(term));

  const hasNoExcludeTerms = excludeTerms.length === 0 || !excludeTerms.some((term) => text.includes(term));

  return hasAllIncludeTerms && hasNoExcludeTerms;
}
