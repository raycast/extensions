import { openai } from "../hook/configAPI";

type Input = {
  /**
   * The query for the deep research
   */
  query: string;
  /**
   * Given a list of domains, limit the citations used by the online model to URLs from the specified domains.
   * Currently limited to only 3 domains for whitelisting and blacklisting.
   * For blacklisting add a - to the beginning of the domain string.
   */
  searchDomainFilter?: string[];
  /**
   * Returns search results within the specified time interval.
   */
  searchRecencyFilter?: "month" | "week" | "day" | "hour";
};

/**
 * Call this tool when the user wants to research a specific query very deeply.
 *
 * @remarks
 * When you ask a Deep Research question, Perplexity performs dozens of searches, reads hundreds of sources, and reasons through the material to autonomously deliver a comprehensive report.
 */
export default async function tool(input: Input) {
  const response = await openai.chat.completions.create({
    messages: [{ role: "user", content: input.query }],
    model: "sonar-deep-research",
    search_domain_filter: input.searchDomainFilter,
    search_recency_filter: input.searchRecencyFilter,
  });

  return {
    content: response.choices[0].message.content,
    citations: response.citations,
  };
}
