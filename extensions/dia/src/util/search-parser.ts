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
      includeTerms.push(term.slice(1).toLowerCase());
    } else if (term.startsWith("-") && term.length > 1) {
      excludeTerms.push(term.slice(1).toLowerCase());
    } else if (term.length > 0 && term !== "-") {
      includeTerms.push(term.toLowerCase());
    }
  }

  return { includeTerms, excludeTerms };
}

export function matchesQuery(text: string, parsedQuery: ParsedQuery): boolean {
  const { includeTerms, excludeTerms } = parsedQuery;

  const hasAllIncludeTerms = includeTerms.length === 0 || includeTerms.every((term) => text.includes(term));
  const hasNoExcludeTerms = excludeTerms.length === 0 || !excludeTerms.some((term) => text.includes(term));

  return hasAllIncludeTerms && hasNoExcludeTerms;
}
