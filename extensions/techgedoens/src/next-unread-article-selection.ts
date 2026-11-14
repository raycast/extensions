import type { ArchivedArticle } from "./article-archive";

export type NextUnreadArticleOrder = "newest" | "oldest";

export function findNextUnreadArticle(
  articles: ArchivedArticle[],
  order: NextUnreadArticleOrder,
): ArchivedArticle | undefined {
  return articles
    .filter((article) => !article.isRead)
    .sort((first, second) => {
      const dateDifference = first.publishedAt.getTime() - second.publishedAt.getTime();
      const orderedDateDifference = order === "oldest" ? dateDifference : -dateDifference;
      return orderedDateDifference || first.id.localeCompare(second.id);
    })[0];
}
