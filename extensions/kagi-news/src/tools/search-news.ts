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
   * Results are ordered newest first.
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

// Search results give batchDate as "2026-09-19 12:00:08.660831": UTC, but with no timezone marker, which
// JavaScript would otherwise read as local time. Normalize it to a UTC timestamp before comparing dates.
function batchTimestamp(batchDate: string): number {
  const hasTimezone = /(Z|[+-]\d\d:?\d\d)$/i.test(batchDate);
  return new Date(hasTimezone ? batchDate : `${batchDate.replace(" ", "T").replace(/\.\d+$/, "")}Z`).getTime();
}

export default async function (input: Input) {
  if (input.query.trim().length < 3) {
    return { error: "Search query must be at least 3 characters long." };
  }

  const fromTime = input.from ? new Date(input.from).getTime() : undefined;
  if (fromTime !== undefined && Number.isNaN(fromTime)) {
    return { error: `Invalid "from" date: ${input.from}. Use ISO 8601, e.g. 2026-06-10T00:00:00Z.` };
  }

  const preferences = getPreferenceValues<Preferences>();
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 15);
  const categoryFilter = input.category?.trim().toLowerCase();
  // The search API rejects a lower date bound, and its own category filter uses an internal taxonomy that
  // doesn't match Kagi News' category names (e.g. "tech" instead of "Technology"). Both are therefore applied
  // here, over-fetching a full page from the API first since these filters narrow results down after the fact.
  const needsClientFilter = Boolean(categoryFilter) || fromTime !== undefined;
  const fetchLimit = needsClientFilter ? 100 : limit;

  const { results, totalCount, hasMore } = await searchStories(input.query, preferences.language, fetchLimit, input.to);

  const matchingResults = results.filter(
    (result) =>
      (!categoryFilter || result.categoryName.toLowerCase().includes(categoryFilter)) &&
      (fromTime === undefined || batchTimestamp(result.batchDate) >= fromTime),
  );
  // Results come newest first: once one predates `from`, every result on the following pages does too.
  const pastRange = fromTime !== undefined && results.some((result) => batchTimestamp(result.batchDate) < fromTime);

  const limitedResults = matchingResults.slice(0, limit);
  const articles = storiesToArticles(limitedResults.map((result) => result.story));

  return {
    query: input.query,
    category: input.category,
    totalCount: needsClientFilter ? undefined : totalCount,
    // More matches may exist beyond the fetched page unless it already reached back before `from`.
    hasMore: matchingResults.length > limit || (hasMore && !pastRange),
    stories: articles.map((article, index) => ({
      ...toAIStorySummary(article),
      category: limitedResults[index].categoryName || article.category,
      date: new Date(batchTimestamp(limitedResults[index].batchDate)).toISOString(),
    })),
  };
}
