import { createAIArticleResult } from "../ai-article-result";
import { readArticleArchive } from "../article-archive";
import { selectPersonalArticles } from "../personal-article-query";

type Input = {
  /** A concise German topic or a few keywords. Omit this field to retrieve all favorite articles. */
  query?: string;
  /** Zero-based result offset. Use the returned nextOffset to retrieve the next page. */
  offset?: number;
};

export default async function getFavoriteArticles(input: Input = {}) {
  const archive = await readArticleArchive();
  const favoriteArticles = archive.filter((article) => article.isFavorite);
  const page = selectPersonalArticles(favoriteArticles, input);

  return {
    query: page.query,
    totalFavoriteCount: favoriteArticles.length,
    matchingCount: page.matchingCount,
    returnedCount: page.articles.length,
    offset: page.offset,
    nextOffset: page.nextOffset,
    articles: page.articles.map((article) => createAIArticleResult(article, true)),
  };
}
