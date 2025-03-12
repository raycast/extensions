import { fetchArticles } from "../utils";

type Input = {
  /**
   * The search query to find articles
   */
  query: string;
};

/**
 * Search for articles in Caschys Blog
 * @param input The search parameters
 * @returns A list of matching articles
 */
export default async function searchArticles(input: Input) {
  const { query } = input;

  // Fetch articles
  const articles = await fetchArticles(false);

  // Filter articles based on the query
  const filteredArticles = articles.filter((article) => {
    const searchLower = query.toLowerCase();
    return (
      article.title.toLowerCase().includes(searchLower) ||
      article.description.toLowerCase().includes(searchLower) ||
      (article.creator && article.creator.toLowerCase().includes(searchLower)) ||
      (article.categories && article.categories.some((category) => category.toLowerCase().includes(searchLower)))
    );
  });

  // Sort articles by date
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  // Return the results
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
