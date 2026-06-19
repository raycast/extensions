import { compactSearchResults, searchDeepReasoning } from "../exa";

type Input = {
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
  category?: "company" | "people" | "research paper" | "news" | "personal site" | "financial report";
};

/**
 * @returns Deep-reasoning search results with highlights and published dates when available.
 */
export default async function (input: Input) {
  const splitDomains = (domains?: string) =>
    domains
      ?.split(/[\n,]/)
      .map((domain) => domain.trim())
      .filter(Boolean);

  const normalizedInput =
    input.category === "people"
      ? {
          ...input,
          includeDomains: splitDomains(input.includeDomains)?.filter((domain) => {
            const normalized = domain.trim().toLowerCase();
            return normalized === "linkedin.com" || normalized.endsWith(".linkedin.com");
          }),
          excludeDomains: undefined,
        }
      : input.category === "company"
        ? {
            ...input,
            includeDomains: splitDomains(input.includeDomains),
            excludeDomains: undefined,
          }
        : {
            ...input,
            includeDomains: splitDomains(input.includeDomains),
            excludeDomains: splitDomains(input.excludeDomains),
          };

  return compactSearchResults(await searchDeepReasoning(normalizedInput)).map((result) => ({
    title: result.title,
    url: result.url,
    highlights: result.highlights,
    publishedDate: result.publishedDate,
  }));
}
