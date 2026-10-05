import { environment, LaunchType, LocalStorage, showToast, Toast } from "@raycast/api";
import { Article, fetchArticleFeedPage } from "./articles";

const ARTICLE_ARCHIVE_KEY = "article-archive-v1";
const ARTICLE_ARCHIVE_LIMIT_KEY = "article-archive-limit-v1";
const ARTICLE_READ_STATUS_KEY = "article-read-status-v1";
const ARTICLE_FAVORITE_STATUS_KEY = "article-favorite-status-v1";
const MAX_INCREMENTAL_FEED_PAGES = 20;
const MAX_BACKFILL_FEED_PAGES = 200;
const MAX_ARCHIVE_ARTICLES = 2_000;
const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024;
const ARCHIVE_LIMIT_GUIDANCE = "Choose a shorter retention period or use Search Techgedöns to find older articles.";
const ARCHIVE_LIMIT_TITLE = "Article Archive Limit Reached";
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

type StoredArticleStatuses = Record<string, boolean>;

type ArticleBackfillResult = {
  articles: Article[];
  limitMessage?: string;
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
  try {
    return await refreshArticleArchiveStrict(retention);
  } catch (error) {
    const storedArchive = await readStoredArchive();
    if (storedArchive) {
      return applyRetention(storedArchive.articles, retention);
    }

    throw error;
  }
}

export async function refreshArticleArchiveStrict(retention: ArticleRetention): Promise<ArchivedArticle[]> {
  return runArchiveUpdate(() => performArticleArchiveRefresh(retention));
}

async function performArticleArchiveRefresh(retention: ArticleRetention): Promise<ArchivedArticle[]> {
  const storedArchive = await readStoredArchive();
  const existingArticles = storedArchive?.articles ?? [];
  const shouldBackfill = !storedArchive || retentionRank[retention] > retentionRank[storedArchive.retention];
  const backfillResult = shouldBackfill ? await fetchArticlesForRetention(retention, existingArticles) : undefined;
  const fetchedArticles = backfillResult?.articles ?? (await fetchArticlesUntilKnown(existingArticles));

  // Article choices are also stored separately, so a refresh cannot revert a read or favorite change
  // even if another Raycast command saves that change after this read and before the archive write.
  const latestStoredArchive = await readStoredArchive();
  const latestExistingArticles = latestStoredArchive?.articles ?? existingArticles;
  const mergeResult = mergeArticlesWithinLimits(latestExistingArticles, fetchedArticles, retention);
  const retainedArticles = mergeResult.articles;
  const limitMessage =
    backfillResult?.limitMessage ??
    mergeResult.limitMessage ??
    (storedArchive?.retention === retention ? storedArchive.limitMessage : undefined);

  await writeStoredArchive({
    articles: retainedArticles,
    limitMessage,
    retention,
    updatedAt: new Date().toISOString(),
  });

  if (limitMessage && environment.launchType === LaunchType.UserInitiated) {
    await showToast({
      style: Toast.Style.Failure,
      title: ARCHIVE_LIMIT_TITLE,
      message: limitMessage,
    });
  }

  return (await readStoredArchive())?.articles ?? retainedArticles;
}

export async function readArticleArchive(): Promise<ArchivedArticle[]> {
  return (await readStoredArchive())?.articles ?? [];
}

export async function readArticleArchiveLimitMessage(): Promise<string | undefined> {
  return await LocalStorage.getItem<string>(ARTICLE_ARCHIVE_LIMIT_KEY);
}

export async function setArticleReadStatus(articleId: string, isRead: boolean): Promise<void> {
  await setArticlesReadStatus([articleId], isRead);
}

export async function setArticleReadStatusForArticle(article: Article, isRead: boolean): Promise<void> {
  await runArchiveUpdate(async () => {
    await setStoredArticleStatuses(ARTICLE_READ_STATUS_KEY, [[article.id, isRead]]);
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
      limitMessage: storedArchive?.limitMessage,
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
  await updateArticleReadStatuses(articleIds, isRead, (articles) =>
    articles.map((article) => (articleIdSet.has(article.id) ? { ...article, isRead } : article)),
  );
}

export async function setAllArticlesReadStatus(isRead: boolean): Promise<void> {
  await runArchiveUpdate(async () => {
    const storedArchive = await readStoredArchive();
    if (!storedArchive) {
      return;
    }

    await setStoredArticleStatuses(
      ARTICLE_READ_STATUS_KEY,
      storedArchive.articles.map((article) => [article.id, isRead]),
    );
    await writeStoredArchive({
      ...storedArchive,
      articles: storedArchive.articles.map((article) => ({ ...article, isRead })),
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function setArticleFavoriteStatus(article: Article, isFavorite: boolean): Promise<void> {
  await runArchiveUpdate(async () => {
    await setStoredArticleStatuses(ARTICLE_FAVORITE_STATUS_KEY, [[article.id, isFavorite]]);
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
      limitMessage: storedArchive?.limitMessage,
      retention: storedArchive?.retention ?? "month",
      updatedAt: new Date().toISOString(),
    });
  });
}

async function updateArticleReadStatuses(
  articleIds: string[],
  isRead: boolean,
  updateArticles: (articles: ArchivedArticle[]) => ArchivedArticle[],
): Promise<void> {
  await runArchiveUpdate(async () => {
    await setStoredArticleStatuses(
      ARTICLE_READ_STATUS_KEY,
      articleIds.map((articleId) => [articleId, isRead]),
    );
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

async function fetchArticlesForRetention(
  retention: ArticleRetention,
  existingArticles: ArchivedArticle[],
): Promise<ArticleBackfillResult> {
  const cutoff = getRetentionCutoff(retention);
  const articles: Article[] = [];
  const articleIds = new Set<string>();
  const accumulator = createArchiveAccumulator(existingArticles, retention);

  for (let page = 1; page <= MAX_BACKFILL_FEED_PAGES; page += 1) {
    const pageArticles = await fetchArticleFeedPage(page);
    const newArticles = pageArticles.filter((article) => !articleIds.has(article.id));

    if (pageArticles.length === 0 || newArticles.length === 0) {
      return { articles };
    }

    for (const article of newArticles) {
      articleIds.add(article.id);
      const result = accumulator.add(article);
      if (result === "article-limit") {
        return {
          articles,
          limitMessage: getArticleLimitMessage(),
        };
      }
      if (result === "byte-limit") {
        return {
          articles,
          limitMessage: getByteLimitMessage(),
        };
      }
      if (result === "added") {
        articles.push(article);
      }
    }

    if (cutoff && pageArticles.some((article) => article.publishedAt < cutoff)) {
      return { articles };
    }

    if (page === MAX_BACKFILL_FEED_PAGES) {
      return {
        articles,
        limitMessage: `The initial archive import reached the ${MAX_BACKFILL_FEED_PAGES.toLocaleString("en-US")} page safety limit. ${ARCHIVE_LIMIT_GUIDANCE}`,
      };
    }
  }

  return { articles };
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

function mergeArticlesWithinLimits(
  existingArticles: ArchivedArticle[],
  fetchedArticles: Article[],
  retention: ArticleRetention,
): { articles: ArchivedArticle[]; limitMessage?: string } {
  const accumulator = createArchiveAccumulator(existingArticles, retention);
  let limitMessage: string | undefined;

  for (const article of fetchedArticles) {
    const result = accumulator.add(article);
    if (result === "article-limit") {
      limitMessage = getArticleLimitMessage();
      break;
    }
    if (result === "byte-limit") {
      limitMessage = getByteLimitMessage();
      break;
    }
  }

  return { articles: accumulator.getArticles(), limitMessage };
}

function createArchiveAccumulator(existingArticles: ArchivedArticle[], retention: ArticleRetention) {
  const cutoff = getRetentionCutoff(retention);
  const retainedExistingArticles = applyRetention(existingArticles, retention);
  const articlesById = new Map(retainedExistingArticles.map((article) => [article.id, article]));
  const articleBytesById = new Map(
    retainedExistingArticles.map((article) => [article.id, getStoredArticleByteLength(article)]),
  );
  let totalArticleBytes = [...articleBytesById.values()].reduce((total, bytes) => total + bytes, 0);
  const archiveBaseBytes = getEmptyArchiveByteLength(retention);

  function add(article: Article): "added" | "skipped" | "article-limit" | "byte-limit" {
    const existingArticle = articlesById.get(article.id);
    const archivedArticle: ArchivedArticle = {
      ...article,
      isFavorite: existingArticle?.isFavorite ?? false,
      isRead: existingArticle?.isRead ?? false,
    };

    if (cutoff && !archivedArticle.isFavorite && archivedArticle.publishedAt < cutoff) {
      return "skipped";
    }

    const nextArticleCount = existingArticle ? articlesById.size : articlesById.size + 1;
    if (nextArticleCount > MAX_ARCHIVE_ARTICLES) {
      return "article-limit";
    }

    const previousArticleBytes = articleBytesById.get(article.id) ?? 0;
    const nextArticleBytes = getStoredArticleByteLength(archivedArticle);
    const nextTotalArticleBytes = totalArticleBytes - previousArticleBytes + nextArticleBytes;
    const commaBytes = Math.max(0, nextArticleCount - 1);
    if (archiveBaseBytes + nextTotalArticleBytes + commaBytes > MAX_ARCHIVE_BYTES) {
      return "byte-limit";
    }

    articlesById.set(article.id, archivedArticle);
    articleBytesById.set(article.id, nextArticleBytes);
    totalArticleBytes = nextTotalArticleBytes;
    return "added";
  }

  function getArticles(): ArchivedArticle[] {
    return [...articlesById.values()].sort(
      (first, second) => second.publishedAt.getTime() - first.publishedAt.getTime(),
    );
  }

  return { add, getArticles };
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

async function readStoredArchive(): Promise<
  { articles: ArchivedArticle[]; limitMessage?: string; retention: ArticleRetention } | undefined
> {
  const [storedValue, limitMessage, readStatuses, favoriteStatuses] = await Promise.all([
    LocalStorage.getItem<string>(ARTICLE_ARCHIVE_KEY),
    LocalStorage.getItem<string>(ARTICLE_ARCHIVE_LIMIT_KEY),
    readStoredArticleStatuses(ARTICLE_READ_STATUS_KEY),
    readStoredArticleStatuses(ARTICLE_FAVORITE_STATUS_KEY),
  ]);
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
          isFavorite: favoriteStatuses[article.id] ?? Boolean(article.isFavorite),
          isRead: readStatuses[article.id] ?? Boolean(article.isRead),
        },
      ];
    });

    return {
      articles,
      limitMessage: typeof limitMessage === "string" ? limitMessage : undefined,
      retention: normalizeArticleRetention(storedArchive.retention),
    };
  } catch {
    return undefined;
  }
}

async function writeStoredArchive(archive: {
  articles: ArchivedArticle[];
  limitMessage?: string;
  retention: ArticleRetention;
  updatedAt: string;
}): Promise<void> {
  const storedArchive: StoredArticleArchive = {
    articles: archive.articles.map(toStoredArchivedArticle),
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
  if (archive.limitMessage) {
    await LocalStorage.setItem(ARTICLE_ARCHIVE_LIMIT_KEY, archive.limitMessage);
  } else {
    await LocalStorage.removeItem(ARTICLE_ARCHIVE_LIMIT_KEY);
  }
}

function toStoredArchivedArticle(article: ArchivedArticle): StoredArchivedArticle {
  return { ...article, publishedAt: article.publishedAt.toISOString() };
}

function getStoredArticleByteLength(article: ArchivedArticle): number {
  return getSerializedByteLength(JSON.stringify(toStoredArchivedArticle(article)));
}

function getEmptyArchiveByteLength(retention: ArticleRetention): number {
  return getSerializedByteLength(
    JSON.stringify({ articles: [], retention, updatedAt: new Date().toISOString() } satisfies StoredArticleArchive),
  );
}

function getArticleLimitMessage(): string {
  return `The initial archive import reached the ${MAX_ARCHIVE_ARTICLES.toLocaleString("en-US")} article safety limit. ${ARCHIVE_LIMIT_GUIDANCE}`;
}

function getByteLimitMessage(): string {
  return `The initial archive import reached the ${formatMegabytes(MAX_ARCHIVE_BYTES)} storage safety limit. ${ARCHIVE_LIMIT_GUIDANCE}`;
}

async function readStoredArticleStatuses(key: string): Promise<StoredArticleStatuses> {
  const storedValue = await LocalStorage.getItem<string>(key);
  if (!storedValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(storedValue) as unknown;
    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
    );
  } catch {
    return {};
  }
}

async function setStoredArticleStatuses(key: string, entries: [string, boolean][]): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const statuses = await readStoredArticleStatuses(key);
  for (const [articleId, status] of entries) {
    statuses[articleId] = status;
  }
  await LocalStorage.setItem(key, JSON.stringify(statuses));
}

function getSerializedByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
