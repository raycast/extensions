import { fetchArticles } from "../utils";
import { getPreferenceValues } from "@raycast/api";

type Input = {
  /**
   * The number of articles to return (optional)
   */
  limit?: number;
};

/**
 * Get the latest articles from Caschys Blog
 * @param input The parameters
 * @returns A list of the latest articles
 */
export default async function getLatestArticles(input: Input) {
  const preferences = getPreferenceValues();
  const maxPosts = parseInt(preferences.maxPosts as string) || 90;

  // Use the provided limit or default to maxPosts from preferences
  const limit = input.limit && input.limit > 0 ? Math.min(input.limit, maxPosts) : maxPosts;

  // Fetch articles
  const articles = await fetchArticles(false);

  // Sort articles by date
  const sortedArticles = [...articles].sort((a, b) => {
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  // Limit the number of articles
  const limitedArticles = sortedArticles.slice(0, limit);

  // Return the results
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
