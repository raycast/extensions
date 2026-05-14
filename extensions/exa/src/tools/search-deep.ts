import { compactSearchResults, searchDeepReasoning } from "../exa";

type Input = {
  /**
   * The input query string.
   */
  query: string;
  /**
   * Number of search results to return.
   * @default 10
   */
  numResults?: number;
  /**
   * Restrict results to the listed domains.
   */
  includeDomains?: string[];
  /**
   * Exclude results from the listed domains.
   */
  excludeDomains?: string[];
  /**
   * A data category to focus on when searching, with higher comprehensivity and data cleanliness.
   */
  category?: "company" | "people" | "research paper" | "news" | "personal site" | "financial report";
};

/**
 * @returns Deep-reasoning search results with highlights and published dates when available.
 */
export default async function (input: Input) {
  const normalizedInput =
    input.category === "people"
      ? {
          ...input,
          includeDomains: input.includeDomains?.filter((domain) => {
            const normalized = domain.trim().toLowerCase();
            return normalized === "linkedin.com" || normalized.endsWith(".linkedin.com");
          }),
          excludeDomains: undefined,
        }
      : input.category === "company"
        ? {
            ...input,
            excludeDomains: undefined,
          }
        : input;

  return compactSearchResults(await searchDeepReasoning(normalizedInput)).map((result) => ({
    title: result.title,
    url: result.url,
    highlights: result.highlights,
    publishedDate: result.publishedDate,
  }));
}
