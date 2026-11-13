import { Cache } from "@raycast/api";
import { Article, fetchArticles } from "./articles";

const ARTICLES_CACHE_KEY = "latest-articles-v2";
const cache = new Cache({ capacity: 25 * 1024 * 1024 });

type CachedArticles = {
  articles: Array<Omit<Article, "publishedAt"> & { publishedAt: string }>;
  updatedAt: string;
};

export function readCachedArticles(limit: number): Article[] | undefined {
  const cachedValue = cache.get(ARTICLES_CACHE_KEY);
  if (!cachedValue) {
    return undefined;
  }

  try {
    const cached = JSON.parse(cachedValue) as CachedArticles;
    if (!Array.isArray(cached.articles)) {
      return undefined;
    }

    const articles = cached.articles.flatMap((article) => {
      const publishedAt = new Date(article.publishedAt);
      if (!article.id || !article.title || !article.url || Number.isNaN(publishedAt.getTime())) {
        return [];
      }

      return [{ ...article, publishedAt }];
    });

    return articles.slice(0, limit);
  } catch {
    return undefined;
  }
}

export async function refreshArticleCache(limit: number): Promise<Article[]> {
  const articles = await fetchArticles(limit);
  const cached: CachedArticles = {
    articles: articles.map((article) => ({ ...article, publishedAt: article.publishedAt.toISOString() })),
    updatedAt: new Date().toISOString(),
  };

  cache.set(ARTICLES_CACHE_KEY, JSON.stringify(cached));
  return articles;
}
