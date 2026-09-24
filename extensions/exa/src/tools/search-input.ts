import { compactSearchResults, searchHighlights, type SearchCategory, type SearchToolInput } from "../exa";

export type SearchQueryInput = {
  /**
   * The input query string.
   */
  query: string;
  /**
   * Number of search results to return.
   */
  numResults?: number;
  /**
   * Restrict results to these domains, separated by commas or new lines.
   */
  includeDomains?: string;
  /**
   * Exclude results from these domains, separated by commas or new lines.
   */
  excludeDomains?: string;
  /**
   * A data category to focus on when searching, with higher comprehensivity and data cleanliness.
   */
  category?: SearchCategory;
};

type HighlightSearch = typeof searchHighlights;

function splitDomains(domains?: string) {
  return domains
    ?.split(/[\n,]/)
    .map((domain) => domain.trim())
    .filter(Boolean);
}

export function normalizeSearchQuery(input: SearchQueryInput): SearchToolInput {
  const includeDomains = splitDomains(input.includeDomains);

  if (input.category === "people") {
    return {
      ...input,
      includeDomains: includeDomains?.filter((domain) => {
        const normalized = domain.trim().toLowerCase();
        return normalized === "linkedin.com" || normalized.endsWith(".linkedin.com");
      }),
      excludeDomains: undefined,
    };
  }

  if (input.category === "company") {
    return {
      ...input,
      includeDomains,
      excludeDomains: undefined,
    };
  }

  return {
    ...input,
    includeDomains,
    excludeDomains: splitDomains(input.excludeDomains),
  };
}

export async function runHighlightSearch(input: SearchQueryInput, search: HighlightSearch) {
  return compactSearchResults(await search(normalizeSearchQuery(input))).map((result) => ({
    title: result.title,
    url: result.url,
    highlights: result.highlights,
    publishedDate: result.publishedDate,
  }));
}
