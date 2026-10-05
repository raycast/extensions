import {
  clampToolResultCount,
  getHugeiconsApiKey,
  prioritizeStyleMatches,
  resolveToolStyle,
  toAiIconSummary,
} from "../lib/hugeicons-ai";
import { searchHugeiconsMetas } from "../lib/hugeicons-source";

type Input = {
  /**
   * Natural-language icon request, keyword, icon name, tag, category, or use case.
   */
  query: string;
  /**
   * Optional style to prioritize in the returned results.
   * Use one of: default, stroke-standard, solid-standard, duotone-standard,
   * stroke-rounded, solid-rounded, duotone-rounded, twotone-rounded, bulk-rounded,
   * solid-sharp, or stroke-sharp.
   */
  style?: string;
  /**
   * Maximum number of results to return.
   * Use a small number when the user wants a short shortlist.
   */
  count?: number;
};

export default async function tool(input: Input) {
  const query = input.query.trim();

  if (!query) {
    return {
      query,
      results: [],
      message: "Provide a search query such as 'rating star', 'chemistry', or 'rounded home icon'.",
    };
  }

  const apiKey = await getHugeiconsApiKey();
  const requestedStyle = resolveToolStyle(input.style);
  const count = clampToolResultCount(input.count);
  const abortController = new AbortController();

  const response = await searchHugeiconsMetas({
    query,
    perPage: count * 3,
    apiKey,
    signal: abortController.signal,
  });
  const rankedResults = prioritizeStyleMatches(response.items, requestedStyle);
  const results = rankedResults.slice(0, count).map(toAiIconSummary);
  const styleMatchCount =
    requestedStyle === "default"
      ? results.length
      : results.filter((item) => item.availableStyles.includes(requestedStyle)).length;

  return {
    query,
    requestedStyle,
    returnedResults: results.length,
    styleMatchCount,
    results,
    message:
      requestedStyle !== "default" && styleMatchCount === 0
        ? `No exact ${requestedStyle} style matches were confirmed in the top results, so the shortlist includes the closest relevant icons.`
        : undefined,
  };
}
