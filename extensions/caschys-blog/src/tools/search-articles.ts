import { fetchArticles, safeParseDate } from "../utils";

/**
 * Input parameters for the search-articles tool
 */
type Input = {
  /**
   * The search query to find articles
   */
  query: string;
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

  /**
   * Fetch all articles from the blog
   * Uses cached articles when available to improve performance
   */
  const articles = await fetchArticles(false);

  /**
   * Filter articles based on the query
   * Searches in title, description, creator, and categories
   * Case-insensitive search using toLowerCase()
   */
  const searchLower = query.toLowerCase();
  const filteredArticles = articles.filter((article) => {
    return (
      article.title.toLowerCase().includes(searchLower) ||
      article.description.toLowerCase().includes(searchLower) ||
      (article.creator && article.creator.toLowerCase().includes(searchLower)) ||
      (article.categories && article.categories.some((category) => category.toLowerCase().includes(searchLower)))
    );
  });

  /**
   * Sort articles by publication date (newest first)
   * Uses safeParseDate to handle potential invalid date strings
   */
  const sortedArticles = [...filteredArticles].sort((a, b) => {
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
      description: article.description,
      creator: article.creator || "Unknown",
      categories: article.categories || [],
    })),
    count: sortedArticles.length,
  };
}
