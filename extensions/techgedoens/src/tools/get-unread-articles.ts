import { createAIArticleResult } from "../ai-article-result";
import { readArticleArchive } from "../article-archive";
import { selectPersonalArticles } from "../personal-article-query";

type Input = {
  /** A concise German topic or a few keywords. Omit this field to retrieve all unread articles. */
  query?: string;
  /** Zero-based result offset. Use the returned nextOffset to retrieve the next page. */
  offset?: number;
};

export default async function getUnreadArticles(input: Input = {}) {
  const archive = await readArticleArchive();
  const unreadArticles = archive.filter((article) => !article.isRead);
  const page = selectPersonalArticles(unreadArticles, input);

  return {
    query: page.query,
    totalUnreadCount: unreadArticles.length,
    matchingCount: page.matchingCount,
    returnedCount: page.articles.length,
    offset: page.offset,
    nextOffset: page.nextOffset,
    articles: page.articles.map((article) => createAIArticleResult(article, true)),
  };
}
