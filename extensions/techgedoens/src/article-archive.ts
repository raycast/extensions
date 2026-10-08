import { LocalStorage } from "@raycast/api";
import { Article, fetchArticleFeedPage } from "./articles";

const ARTICLE_ARCHIVE_KEY = "article-archive-v1";
const MAX_INCREMENTAL_FEED_PAGES = 20;
const MAX_BACKFILL_FEED_PAGES = 200;
const MAX_ARCHIVE_ARTICLES = 2_000;
const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024;
const ARCHIVE_LIMIT_GUIDANCE = "Choose a shorter retention period or use Search Techgedöns to find older articles.";
let archiveUpdateQueue: Promise<void> = Promise.resolve();

export type ArticleRetention = "week" | "month" | "year" | "never";

export type ArchivedArticle = Article & {
  isFavorite: boolean;
  isRead: boolean;
};

type StoredArchivedArticle = Omit<ArchivedArticle, "publishedAt"> & {
  publishedAt: string;
};

type StoredArticleArchive = {
  articles: StoredArchivedArticle[];
  retention: ArticleRetention;
  updatedAt: string;
};

const retentionRank: Record<ArticleRetention, number> = {
  week: 0,
  month: 1,
  year: 2,
  never: 3,
};

export function normalizeArticleRetention(value: string | undefined): ArticleRetention {
  return value === "week" || value === "month" || value === "year" || value === "never" ? value : "month";
}

export async function refreshArticleArchive(retention: ArticleRetention): Promise<ArchivedArticle[]> {
  return runArchiveUpdate(() => performArticleArchiveRefresh(retention));
}

async function performArticleArchiveRefresh(retention: ArticleRetention): Promise<ArchivedArticle[]> {
  const storedArchive = await readStoredArchive();
  const existingArticles = storedArchive?.articles ?? [];
  const shouldBackfill = !storedArchive || retentionRank[retention] > retentionRank[storedArchive.retention];
  const fetchedArticles = shouldBackfill
    ? await fetchArticlesForRetention(retention)
    : await fetchArticlesUntilKnown(existingArticles);
  const mergedArticles = mergeArticles(existingArticles, fetchedArticles);
  const retainedArticles = applyRetention(mergedArticles, retention);

  await writeStoredArchive({
    articles: retainedArticles,
    retention,
    updatedAt: new Date().toISOString(),
  });

  return retainedArticles;
}

export async function readArticleArchive(): Promise<ArchivedArticle[]> {
  return (await readStoredArchive())?.articles ?? [];
}

export async function setArticleReadStatus(articleId: string, isRead: boolean): Promise<void> {
  await setArticlesReadStatus([articleId], isRead);
}

export async function setArticleReadStatusForArticle(article: Article, isRead: boolean): Promise<void> {
  await runArchiveUpdate(async () => {
    const storedArchive = await readStoredArchive();
    const existingArticles = storedArchive?.articles ?? [];
    const existingArticle = existingArticles.find((archivedArticle) => archivedArticle.id === article.id);
    const updatedArticle: ArchivedArticle = {
      ...article,
      isFavorite: existingArticle?.isFavorite ?? false,
      isRead,
    };
    const articles = existingArticle
      ? existingArticles.map((archivedArticle) =>
          archivedArticle.id === article.id ? { ...archivedArticle, ...article, isRead } : archivedArticle,
        )
      : [updatedArticle, ...existingArticles];

    await writeStoredArchive({
      articles: articles.sort((first, second) => second.publishedAt.getTime() - first.publishedAt.getTime()),
      retention: storedArchive?.retention ?? "month",
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function setArticlesReadStatus(articleIds: string[], isRead: boolean): Promise<void> {
  if (articleIds.length === 0) {
    return;
  }

  const articleIdSet = new Set(articleIds);
  await updateArticleReadStatuses((articles) =>
    articles.map((article) => (articleIdSet.has(article.id) ? { ...article, isRead } : article)),
  );
}

export async function setAllArticlesReadStatus(isRead: boolean): Promise<void> {
  await updateArticleReadStatuses((articles) => articles.map((article) => ({ ...article, isRead })));
}

export async function setArticleFavoriteStatus(article: Article, isFavorite: boolean): Promise<void> {
  await runArchiveUpdate(async () => {
    const storedArchive = await readStoredArchive();
    const existingArticles = storedArchive?.articles ?? [];
    const existingArticle = existingArticles.find((archivedArticle) => archivedArticle.id === article.id);
    const updatedArticle: ArchivedArticle = {
      ...article,
      isFavorite,
      isRead: existingArticle?.isRead ?? false,
    };
    const articles = existingArticle
      ? existingArticles.map((archivedArticle) =>
          archivedArticle.id === article.id ? { ...archivedArticle, ...article, isFavorite } : archivedArticle,
        )
      : [updatedArticle, ...existingArticles];

    await writeStoredArchive({
      articles: articles.sort((first, second) => second.publishedAt.getTime() - first.publishedAt.getTime()),
      retention: storedArchive?.retention ?? "month",
      updatedAt: new Date().toISOString(),
    });
  });
}

async function updateArticleReadStatuses(
  updateArticles: (articles: ArchivedArticle[]) => ArchivedArticle[],
): Promise<void> {
  await runArchiveUpdate(async () => {
    const storedArchive = await readStoredArchive();
    if (!storedArchive) {
      return;
    }

    await writeStoredArchive({
      ...storedArchive,
      articles: updateArticles(storedArchive.articles),
      updatedAt: new Date().toISOString(),
    });
  });
}

async function runArchiveUpdate<T>(update: () => Promise<T>): Promise<T> {
  const queuedUpdate = archiveUpdateQueue.then(update, update);
  archiveUpdateQueue = queuedUpdate.then(
    () => undefined,
    () => undefined,
  );
  return queuedUpdate;
}

async function fetchArticlesForRetention(retention: ArticleRetention): Promise<Article[]> {
  const cutoff = getRetentionCutoff(retention);
  const articles: Article[] = [];
  const articleIds = new Set<string>();
  let fetchedArticleBytes = 0;

  for (let page = 1; page <= MAX_BACKFILL_FEED_PAGES; page += 1) {
    const pageArticles = await fetchArticleFeedPage(page);
    const newArticles = pageArticles.filter((article) => !articleIds.has(article.id));

    if (pageArticles.length === 0 || newArticles.length === 0) {
      return articles;
    }

    if (articles.length + newArticles.length > MAX_ARCHIVE_ARTICLES) {
      throw new Error(
        `The initial archive import exceeds the ${MAX_ARCHIVE_ARTICLES.toLocaleString("en-US")} article safety limit. ${ARCHIVE_LIMIT_GUIDANCE}`,
      );
    }

    const newArticleBytes = newArticles.reduce(
      (total, article) => total + getSerializedByteLength(JSON.stringify(article)),
      0,
    );
    if (fetchedArticleBytes + newArticleBytes > MAX_ARCHIVE_BYTES) {
      throw new Error(
        `The initial archive import exceeds the ${formatMegabytes(MAX_ARCHIVE_BYTES)} storage safety limit. ${ARCHIVE_LIMIT_GUIDANCE}`,
      );
    }

    for (const article of newArticles) {
      articleIds.add(article.id);
      articles.push(article);
    }
    fetchedArticleBytes += newArticleBytes;

    if (cutoff && pageArticles.some((article) => article.publishedAt < cutoff)) {
      return articles;
    }

    if (page === MAX_BACKFILL_FEED_PAGES) {
      throw new Error(
        `The initial archive import reached the ${MAX_BACKFILL_FEED_PAGES.toLocaleString("en-US")} page safety limit. ${ARCHIVE_LIMIT_GUIDANCE}`,
      );
    }
  }

  return articles;
}

async function fetchArticlesUntilKnown(existingArticles: ArchivedArticle[]): Promise<Article[]> {
  const knownArticleIds = new Set(existingArticles.map((article) => article.id));
  const fetchedArticles: Article[] = [];
  const fetchedArticleIds = new Set<string>();

  for (let page = 1; page <= MAX_INCREMENTAL_FEED_PAGES; page += 1) {
    const pageArticles = await fetchArticleFeedPage(page);
    if (pageArticles.length === 0) {
      break;
    }

    const reachedKnownArticle = pageArticles.some((article) => knownArticleIds.has(article.id));
    for (const article of pageArticles) {
      if (!fetchedArticleIds.has(article.id)) {
        fetchedArticleIds.add(article.id);
        fetchedArticles.push(article);
      }
    }

    if (reachedKnownArticle) {
      break;
    }
  }

  return fetchedArticles;
}

function mergeArticles(existingArticles: ArchivedArticle[], fetchedArticles: Article[]): ArchivedArticle[] {
  const mergedArticles = new Map(existingArticles.map((article) => [article.id, article]));

  for (const article of fetchedArticles) {
    const existingArticle = mergedArticles.get(article.id);
    mergedArticles.set(article.id, {
      ...article,
      isFavorite: existingArticle?.isFavorite ?? false,
      isRead: existingArticle?.isRead ?? false,
    });
  }

  return [...mergedArticles.values()].sort(
    (first, second) => second.publishedAt.getTime() - first.publishedAt.getTime(),
  );
}

function applyRetention(articles: ArchivedArticle[], retention: ArticleRetention): ArchivedArticle[] {
  const cutoff = getRetentionCutoff(retention);
  return cutoff ? articles.filter((article) => article.isFavorite || article.publishedAt >= cutoff) : articles;
}

function getRetentionCutoff(retention: ArticleRetention): Date | undefined {
  if (retention === "never") {
    return undefined;
  }

  const cutoff = new Date();
  if (retention === "week") {
    cutoff.setDate(cutoff.getDate() - 7);
  } else if (retention === "month") {
    cutoff.setMonth(cutoff.getMonth() - 1);
  } else {
    cutoff.setFullYear(cutoff.getFullYear() - 1);
  }
  return cutoff;
}

async function readStoredArchive(): Promise<{ articles: ArchivedArticle[]; retention: ArticleRetention } | undefined> {
  const storedValue = await LocalStorage.getItem<string>(ARTICLE_ARCHIVE_KEY);
  if (!storedValue) {
    return undefined;
  }

  try {
    const storedArchive = JSON.parse(storedValue) as StoredArticleArchive;
    if (!Array.isArray(storedArchive.articles)) {
      return undefined;
    }

    const articles = storedArchive.articles.flatMap((article) => {
      const publishedAt = new Date(article.publishedAt);
      if (!article.id || !article.title || !article.url || Number.isNaN(publishedAt.getTime())) {
        return [];
      }
      return [
        {
          ...article,
          publishedAt,
          isFavorite: Boolean(article.isFavorite),
          isRead: Boolean(article.isRead),
        },
      ];
    });

    return {
      articles,
      retention: normalizeArticleRetention(storedArchive.retention),
    };
  } catch {
    return undefined;
  }
}

async function writeStoredArchive(archive: {
  articles: ArchivedArticle[];
  retention: ArticleRetention;
  updatedAt: string;
}): Promise<void> {
  const storedArchive: StoredArticleArchive = {
    articles: archive.articles.map((article) => ({ ...article, publishedAt: article.publishedAt.toISOString() })),
    retention: archive.retention,
    updatedAt: archive.updatedAt,
  };
  if (storedArchive.articles.length > MAX_ARCHIVE_ARTICLES) {
    throw new Error(
      `The local article archive cannot store more than ${MAX_ARCHIVE_ARTICLES.toLocaleString("en-US")} articles. ${ARCHIVE_LIMIT_GUIDANCE}`,
    );
  }

  const serializedArchive = JSON.stringify(storedArchive);
  if (getSerializedByteLength(serializedArchive) > MAX_ARCHIVE_BYTES) {
    throw new Error(
      `The local article archive exceeds the ${formatMegabytes(MAX_ARCHIVE_BYTES)} storage safety limit. ${ARCHIVE_LIMIT_GUIDANCE}`,
    );
  }

  await LocalStorage.setItem(ARTICLE_ARCHIVE_KEY, serializedArchive);
}

function getSerializedByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
