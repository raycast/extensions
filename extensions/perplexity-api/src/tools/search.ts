import { getPreferenceValues } from "@raycast/api";
import { openai } from "../hook/configAPI";

type Input = {
  /**
   * The query for the deep research
   */
  query: string;
  /**
   * The model to use for the search.
   *
   * @remarks Use "reasoning" for more detailed and nuanced responses.
   *
   * @defaultValue The user's global model set in the extension preferences.
   */
  model?: "sonar" | "sonar-pro" | "sonar-reasoning" | "sonar-reasoning-pro";
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
  const response = await openai.chat.completions.create({
    messages: [{ role: "user", content: input.query }],
    model: input.model ?? preferences.model,
    search_domain_filter: input.searchDomainFilter,
    search_recency_filter: input.searchRecencyFilter,
  });

  return {
    content: response.choices[0].message.content,
    citations: response.citations,
  };
}
