import { getPreferenceValues } from "@raycast/api";
import { openai } from "../hook/configAPI";
import { buildAgentRequest, runAgent } from "../hook/agent";

type Input = {
  /**
   * The query for the deep research
   */
  query: string;
  /**
   * The Perplexity preset to use for the search.
   *
   * @remarks Use "low" or "medium" for more detailed and nuanced responses.
   *
   * @defaultValue The user's global model set in the extension preferences.
   */
  model?: "fast" | "low" | "medium";
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

export default async function tool(input: Input) {
  const preferences: Preferences = getPreferenceValues();
  const { text, citations } = await runAgent(
    openai,
    buildAgentRequest({
      target: input.model ?? preferences.model,
      turns: [{ role: "user", content: input.query }],
      filters: {
        search_domain_filter: input.searchDomainFilter,
        search_recency_filter: input.searchRecencyFilter,
      },
    }),
  );

  return {
    content: text,
    citations: citations.map((c) => c.url),
  };
}
