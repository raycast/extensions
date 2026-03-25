import { SearchResult } from "./chrome-utils";

// ─── Query Tokenization ──────────────────────────────────────
/**
 * Split a search query into lowercase tokens (words).
 * Filters out empty strings from multiple spaces.
 */
export function tokenizeQuery(query: string): string[] {
  if (!query || typeof query !== "string") {
    return [];
  }
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

// ─── Token Matching ──────────────────────────────────────────
/**
 * Check if ALL tokens appear in the target text (case-insensitive).
 * Order does not matter - "request github" matches "GitHub Pull Request".
 */
export function matchesAllTokens(target: string, tokens: string[]): boolean {
  if (!target || typeof target !== "string") {
    return false;
  }
  if (tokens.length === 0) {
    return true;
  }
  const lowerTarget = target.toLowerCase();
  return tokens.every((token) => lowerTarget.includes(token));
}

// ─── Result Filtering ────────────────────────────────────────
export interface FilteredResult extends SearchResult {
  isContentMatch?: boolean;
  contentSnippet?: string;
}

/**
 * Filter results based on query, checking title, URL, domain, and content.
 * Returns results with isContentMatch flag set when match is from content only.
 */
export function filterResults(
  results: SearchResult[],
  query: string,
): FilteredResult[] {
  const tokens = tokenizeQuery(query);

  // If no query, return all results (no filtering needed)
  if (tokens.length === 0) {
    return results;
  }

  return results
    .map((result) => {
      // Check title, URL, and domain first
      const titleUrlMatch =
        matchesAllTokens(result.title || "", tokens) ||
        matchesAllTokens(result.url || "", tokens) ||
        matchesAllTokens(extractDomainForSearch(result.url), tokens);

      // Check content if available
      const contentMatch =
        result.content && matchesAllTokens(result.content, tokens);

      if (titleUrlMatch || contentMatch) {
        const filtered: FilteredResult = { ...result };

        // Mark as content match only if matched via content but not title/URL
        if (contentMatch && !titleUrlMatch) {
          filtered.isContentMatch = true;
          filtered.contentSnippet = generateContentSnippet(
            result.content!,
            query,
          );
        }

        return filtered;
      }

      return null;
    })
    .filter((result): result is FilteredResult => result !== null);
}

// ─── Content Snippet Generation ──────────────────────────────
/**
 * Generate a content snippet showing matching text with context.
 * Returns a substring around the first match with ellipsis.
 */
export function generateContentSnippet(
  content: string,
  query: string,
  maxLength = 80,
): string {
  if (!content || !query) {
    return "";
  }

  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return "";
  }

  const lowerContent = content.toLowerCase();

  // Find the position of the first matching token
  let firstMatchIndex = -1;
  for (const token of tokens) {
    const index = lowerContent.indexOf(token);
    if (index !== -1 && (firstMatchIndex === -1 || index < firstMatchIndex)) {
      firstMatchIndex = index;
    }
  }

  if (firstMatchIndex === -1) {
    return "";
  }

  // Calculate snippet boundaries with context
  const contextBefore = 20;
  const start = Math.max(0, firstMatchIndex - contextBefore);
  const end = Math.min(content.length, start + maxLength);

  let snippet = content.substring(start, end);

  // Clean up whitespace (replace newlines and multiple spaces with single space)
  snippet = snippet.replace(/\s+/g, " ").trim();

  // Add ellipsis
  const prefix = start > 0 ? "..." : "";
  const suffix = end < content.length ? "..." : "";

  return `${prefix}${snippet}${suffix}`;
}

// ─── Helper: Extract domain for search ───────────────────────
function extractDomainForSearch(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
