// AI tool: full-text search across Kagi News stories (same search that powers news.kagi.com)

import { getPreferenceValues } from "@raycast/api";
import { searchStories, storiesToArticles, toAIStorySummary } from "../utils";

type Input = {
  /**
   * Free-text search query, e.g. "OpenAI", "French elections", "climate summit". Minimum 3 characters.
   */
  query: string;
  /**
   * Optional category to restrict results to (e.g. "Technology", "France"), matching Kagi News' own category names.
   */
  category?: string;
  /**
   * Restrict results to this date/time onward, ISO 8601 (e.g. "2026-06-10T00:00:00Z"). Use this together with
   * `to` to cover a specific past day or range ("last week", "on June 10th") resolved to concrete dates.
   * Archives start on 2025-07-09. Omit both `from` and `to` to search across all time.
   */
  from?: string;
  /**
   * Restrict results up to and including this date/time, ISO 8601 (e.g. "2026-06-10T23:59:59Z").
   */
  to?: string;
  /**
   * Maximum number of results to return. Defaults to 8, capped at 15.
   */
  limit?: number;
};

export default async function (input: Input) {
  const preferences = getPreferenceValues<Preferences>();
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 15);
  const categoryFilter = input.category?.trim().toLowerCase();
  // The search API's own category filter uses an internal taxonomy that doesn't match Kagi News' category
  // names (e.g. "tech" instead of "Technology"), so filtering by name is done here instead, over-fetching
  // a larger page from the API first since a category filter narrows down the results after the fact.
  const fetchLimit = categoryFilter ? 100 : limit;

  const { results, totalCount, hasMore } = await searchStories(
    input.query,
    preferences.language,
    fetchLimit,
    input.from,
    input.to,
  );

  const matchingResults = categoryFilter
    ? results.filter((result) => result.categoryName.toLowerCase().includes(categoryFilter))
    : results;

  const limitedResults = matchingResults.slice(0, limit);
  const articles = storiesToArticles(limitedResults.map((result) => result.story));

  return {
    query: input.query,
    category: input.category,
    totalCount: categoryFilter ? undefined : totalCount,
    hasMore: categoryFilter ? matchingResults.length > limit : hasMore,
    stories: articles.map((article, index) => ({
      ...toAIStorySummary(article),
      category: limitedResults[index].categoryName || article.category,
      date: limitedResults[index].batchDate,
    })),
  };
}
