import { safeParseDate, searchArticleFeed, truncateText } from "../utils";

/**
 * Input parameters for the search-articles tool
 */
type Input = {
  /**
   * The search query to find articles
   */
  query: string;
  /**
   * Maximum number of matching articles to return
   */
  limit?: number;
};

/**
 * Search for articles in Caschys Blog
 *
 * This tool allows the AI assistant to search for articles based on a query string.
 * It searches through article titles, descriptions, authors, and categories.
 * Results are sorted by publication date with the newest articles first.
 *
 * @param input The search parameters containing the query string
 * @returns An object containing the matching articles and count
 */
export default async function searchArticles(input: Input) {
  const { query } = input;

  const articles = await searchArticleFeed(query, input.limit);

  /**
   * Sort articles by publication date (newest first)
   * Uses safeParseDate to handle potential invalid date strings
   */
  const sortedArticles = [...articles].sort((a, b) => {
    return safeParseDate(b.pubDate) - safeParseDate(a.pubDate);
  });

  /**
   * Return the formatted results
   * Includes article details and count information
   */
  return {
    articles: sortedArticles.map((article) => ({
      title: article.title,
      link: article.link,
      pubDate: article.pubDate,
      description: truncateText(article.description, 500),
      creator: article.creator || "Unknown",
      categories: article.categories || [],
    })),
    count: sortedArticles.length,
  };
}
