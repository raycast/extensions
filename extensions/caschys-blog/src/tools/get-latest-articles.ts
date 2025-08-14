import { fetchArticles, safeParseDate } from "../utils";
import { getPreferenceValues } from "@raycast/api";

/**
 * Input parameters for the get-latest-articles tool
 */
type Input = {
  /**
   * The number of articles to return (optional)
   */
  limit?: number;
};

/**
 * Get the latest articles from Caschys Blog
 *
 * This tool allows the AI assistant to retrieve the most recent articles from the blog.
 * It fetches articles, sorts them by publication date, and returns a limited number based on preferences.
 * The tool respects user preferences for maximum posts and allows limiting results via input parameter.
 *
 * @param input The parameters containing an optional limit for the number of articles to return
 * @returns An object containing the latest articles, count, and total available
 */
export default async function getLatestArticles(input: Input) {
  /**
   * Get user preferences for maximum posts
   * Falls back to default value of 90 if not specified
   */
  const preferences = getPreferenceValues();
  const maxPosts = parseInt(preferences.maxPosts as string) || 90;

  /**
   * Determine the limit for articles to return
   * Uses the provided limit or defaults to maxPosts from preferences
   * Ensures the limit doesn't exceed the maximum posts setting
   */
  const limit = input.limit && input.limit > 0 ? Math.min(input.limit, maxPosts) : maxPosts;

  /**
   * Fetch articles with error handling
   * Uses cached articles when available to improve performance
   */
  let articles;
  try {
    articles = await fetchArticles(false);
  } catch (error) {
    console.error("Failed to fetch articles:", error);
    throw error;
  }

  /**
   * Sort articles by publication date (newest first)
   * Uses safeParseDate to handle potential invalid date strings
   */
  const sortedArticles = [...articles].sort((a, b) => {
    return safeParseDate(b.pubDate) - safeParseDate(a.pubDate);
  });

  /**
   * Limit the number of articles based on the determined limit
   */
  const limitedArticles = sortedArticles.slice(0, limit);

  /**
   * Return the formatted results
   * Includes article details, count of returned articles, and total available
   */
  return {
    articles: limitedArticles.map((article) => ({
      title: article.title,
      link: article.link,
      pubDate: article.pubDate,
      description: article.description,
      creator: article.creator || "Unknown",
      categories: article.categories || [],
    })),
    count: limitedArticles.length,
    total: articles.length,
  };
}
