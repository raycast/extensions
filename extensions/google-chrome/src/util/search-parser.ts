/**
 * Parses search query to extract include and exclude terms
 * @param query - The search query string
 * @returns Object containing include and exclude terms
 * 
 * @example
 * parseSearchQuery("foo bar /baz") 
 * // returns { includeTerms: ["foo", "bar"], excludeTerms: ["baz"] }
 * 
 * parseSearchQuery("hello /world /test")
 * // returns { includeTerms: ["hello"], excludeTerms: ["world", "test"] }
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
    if (term.startsWith('/') && term.length > 1) {
      // Remove the leading '/' and add to exclude terms
      excludeTerms.push(term.slice(1).toLowerCase());
    } else if (term.length > 0 && term !== '/') {
      // Add to include terms (ignore standalone '/')
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
  
  // Check if all include terms are present
  const hasAllIncludeTerms = includeTerms.length === 0 || 
    includeTerms.every(term => text.includes(term));
  
  // Check if none of the exclude terms are present
  const hasNoExcludeTerms = excludeTerms.length === 0 || 
    !excludeTerms.some(term => text.includes(term));
  
  return hasAllIncludeTerms && hasNoExcludeTerms;
}