import { environment, LaunchType, LocalStorage, showToast, Toast } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { mkdir, open, readdir, readFile, rename, rm, rmdir, stat } from "node:fs/promises";
import { createConnection, createServer, Server } from "node:net";
import { join } from "node:path";
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
const ARCHIVE_UPDATE_LOCK_PATH = join(environment.supportPath, "article-archive-update-v3.lock");
const ARCHIVE_UPDATE_ACTIVE_LOCK_PATH = join(ARCHIVE_UPDATE_LOCK_PATH, "active");
const ARCHIVE_UPDATE_LOCK_HEARTBEAT_MS = 1_000;
const ARCHIVE_UPDATE_LOCK_RETRY_MS = 50;
const ARCHIVE_UPDATE_LOCK_TIMEOUT_MS = 10_000;
const ARCHIVE_UPDATE_LOCK_STALE_MS = 5_000;
const ARCHIVE_UPDATE_OWNER_PROBE_TIMEOUT_MS = 250;
const ARCHIVE_UPDATE_OWNER_PROBE_CACHE_MS = 1_000;
let archiveUpdateQueue: Promise<void> = Promise.resolve();
const archiveUpdateOwnerProbeCache = new Map<string, number>();

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

type ArticleRefreshOptions = {
  forceBackfill?: boolean;
};

type ArchiveLockOwner = {
  id: string;
  pid: number;
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

export async function refreshArticleArchiveStrict(
  retention: ArticleRetention,
  options: ArticleRefreshOptions = {},
): Promise<ArchivedArticle[]> {
  return performArticleArchiveRefresh(retention, options);
}

async function performArticleArchiveRefresh(
  retention: ArticleRetention,
  options: ArticleRefreshOptions,
): Promise<ArchivedArticle[]> {
  const storedArchive = await readStoredArchive();
  const existingArticles = storedArchive?.articles ?? [];
  const retentionChanged = storedArchive?.retention !== retention;
  const shouldBackfill = !storedArchive || retentionChanged || options.forceBackfill;
  const backfillResult = shouldBackfill ? await fetchArticlesForRetention(retention, existingArticles) : undefined;
  const fetchedArticles = backfillResult?.articles ?? (await fetchArticlesUntilKnown(existingArticles));

  return runArchiveUpdate(async () => {
    const latestStoredArchive = await readStoredArchive();
    const latestExistingArticles = latestStoredArchive?.articles ?? existingArticles;
    const mergeResult = mergeArticlesWithinLimits(latestExistingArticles, fetchedArticles, retention);
    const retainedArticles = mergeResult.articles;
    const currentLimitMessage = backfillResult?.limitMessage ?? mergeResult.limitMessage;
    const limitMessage = currentLimitMessage ?? (!shouldBackfill ? latestStoredArchive?.limitMessage : undefined);

    await writeStoredArchive({
      articles: retainedArticles,
      limitMessage,
      retention,
      updatedAt: new Date().toISOString(),
    });

    if (currentLimitMessage && environment.launchType === LaunchType.UserInitiated) {
      await showToast({
        style: Toast.Style.Failure,
        title: ARCHIVE_LIMIT_TITLE,
        message: currentLimitMessage,
      });
    }

    return (await readStoredArchive())?.articles ?? retainedArticles;
  });
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
  const queuedUpdate = archiveUpdateQueue.then(
    () => withArchiveUpdateLock(update),
    () => withArchiveUpdateLock(update),
  );
  archiveUpdateQueue = queuedUpdate.then(
    () => undefined,
    () => undefined,
  );
  return queuedUpdate;
}

async function withArchiveUpdateLock<T>(update: () => Promise<T>): Promise<T> {
  const owner: ArchiveLockOwner = { id: randomUUID(), pid: process.pid };
  const serializedOwner = JSON.stringify(owner);
  const claimPath = join(ARCHIVE_UPDATE_LOCK_PATH, `${owner.id}.claim`);
  const claimOwnerPath = join(claimPath, `${owner.id}.owner`);
  const startedAt = Date.now();
  await mkdir(ARCHIVE_UPDATE_LOCK_PATH, { recursive: true });
  await mkdir(claimPath);
  const ownerFile = await open(claimOwnerPath, "wx");
  try {
    await ownerFile.writeFile(serializedOwner, "utf8");
  } catch (error) {
    await ownerFile.close();
    await removeArchiveUpdateClaim(claimPath, owner.id);
    throw error;
  }
  let ownerServer: Server;
  try {
    ownerServer = await startArchiveUpdateOwnerServer(owner);
  } catch (error) {
    await ownerFile.close();
    await removeArchiveUpdateClaim(claimPath, owner.id);
    throw error;
  }

  const lockHeartbeat = setInterval(() => {
    const heartbeatTime = new Date();
    void ownerFile.utimes(heartbeatTime, heartbeatTime).catch(() => undefined);
  }, ARCHIVE_UPDATE_LOCK_HEARTBEAT_MS);
  lockHeartbeat.unref();

  let hasActiveClaim = false;
  try {
    await removeAbandonedArchiveUpdateWaitingClaims();
    await waitForArchiveUpdateTurn(claimPath, startedAt);
    hasActiveClaim = true;
    return await update();
  } finally {
    clearInterval(lockHeartbeat);
    await ownerFile.close();
    try {
      await removeArchiveUpdateClaim(hasActiveClaim ? ARCHIVE_UPDATE_ACTIVE_LOCK_PATH : claimPath, owner.id);
    } finally {
      await stopArchiveUpdateOwnerServer(ownerServer, owner);
    }
  }
}

async function waitForArchiveUpdateTurn(claimPath: string, startedAt: number): Promise<void> {
  while (true) {
    try {
      await rename(claimPath, ARCHIVE_UPDATE_ACTIVE_LOCK_PATH);
      return;
    } catch (error) {
      if (!isNodeError(error) || (error.code !== "EEXIST" && error.code !== "ENOTEMPTY")) {
        throw error;
      }
    }

    await removeAbandonedArchiveUpdateClaim();
    if (Date.now() - startedAt >= ARCHIVE_UPDATE_LOCK_TIMEOUT_MS) {
      throw new Error("The article archive is busy. Please try again in a moment.");
    }
    await wait(ARCHIVE_UPDATE_LOCK_RETRY_MS);
  }
}

async function removeArchiveUpdateClaim(claimPath: string, ownerId: string): Promise<void> {
  await rm(join(claimPath, `${ownerId}.owner`), { force: true });
  try {
    await rmdir(claimPath);
  } catch (error) {
    if (!isNodeError(error) || (error.code !== "ENOENT" && error.code !== "ENOTEMPTY")) {
      throw error;
    }
  }
}

async function removeAbandonedArchiveUpdateClaim(): Promise<void> {
  try {
    const [ownerNames, lockStats] = await Promise.all([
      readdir(ARCHIVE_UPDATE_ACTIVE_LOCK_PATH),
      stat(ARCHIVE_UPDATE_ACTIVE_LOCK_PATH),
    ]);
    const ownerName = ownerNames.find((name) => name.endsWith(".owner"));
    if (!ownerName) {
      if (Date.now() - lockStats.mtimeMs >= ARCHIVE_UPDATE_LOCK_STALE_MS) {
        await removeEmptyArchiveUpdateClaim();
      }
      return;
    }

    const ownerPath = join(ARCHIVE_UPDATE_ACTIVE_LOCK_PATH, ownerName);
    const [serializedOwner, ownerStats] = await Promise.all([readFile(ownerPath, "utf8"), stat(ownerPath)]);
    const owner = parseArchiveLockOwner(serializedOwner);
    const isStale = Date.now() - ownerStats.mtimeMs >= ARCHIVE_UPDATE_LOCK_STALE_MS;
    if (owner ? await isArchiveUpdateOwnerAlive(owner, isStale) : !isStale) {
      return;
    }

    await rm(ownerPath, { force: true });
    if (owner) {
      await rm(getArchiveUpdateOwnerSocketPath(owner), { force: true });
    }
    await removeEmptyArchiveUpdateClaim();
  } catch (error) {
    if (!isNodeError(error) || (error.code !== "ENOENT" && error.code !== "ENOTDIR")) {
      throw error;
    }
  }
}

async function removeAbandonedArchiveUpdateWaitingClaims(): Promise<void> {
  const claimNames = (await readdir(ARCHIVE_UPDATE_LOCK_PATH)).filter((name) => name.endsWith(".claim"));
  for (const claimName of claimNames) {
    await removeAbandonedArchiveUpdateWaitingClaim(claimName);
  }
}

async function removeAbandonedArchiveUpdateWaitingClaim(claimName: string): Promise<void> {
  const ownerId = claimName.slice(0, -".claim".length);
  const claimPath = join(ARCHIVE_UPDATE_LOCK_PATH, claimName);
  const ownerPath = join(claimPath, `${ownerId}.owner`);
  try {
    const [serializedOwner, ownerStats] = await Promise.all([readFile(ownerPath, "utf8"), stat(ownerPath)]);
    const owner = parseArchiveLockOwner(serializedOwner);
    const isStale = Date.now() - ownerStats.mtimeMs >= ARCHIVE_UPDATE_LOCK_STALE_MS;
    if (owner ? await isArchiveUpdateOwnerAlive(owner, isStale) : !isStale) {
      return;
    }

    await removeArchiveUpdateClaim(claimPath, ownerId);
    if (owner) {
      await rm(getArchiveUpdateOwnerSocketPath(owner), { force: true });
    }
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }

    try {
      const claimStats = await stat(claimPath);
      if (Date.now() - claimStats.mtimeMs >= ARCHIVE_UPDATE_LOCK_STALE_MS) {
        await removeArchiveUpdateClaim(claimPath, ownerId);
      }
    } catch (claimError) {
      if (!isNodeError(claimError) || claimError.code !== "ENOENT") {
        throw claimError;
      }
    }
  }
}

async function removeEmptyArchiveUpdateClaim(): Promise<void> {
  try {
    await rmdir(ARCHIVE_UPDATE_ACTIVE_LOCK_PATH);
  } catch (error) {
    if (!isNodeError(error) || (error.code !== "ENOENT" && error.code !== "ENOTEMPTY")) {
      throw error;
    }
  }
}

function parseArchiveLockOwner(value: string): ArchiveLockOwner | undefined {
  try {
    const parsedValue = JSON.parse(value) as Partial<ArchiveLockOwner>;
    return typeof parsedValue.id === "string" && Number.isInteger(parsedValue.pid)
      ? { id: parsedValue.id, pid: parsedValue.pid as number }
      : undefined;
  } catch {
    return undefined;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return isNodeError(error) && error.code === "EPERM";
  }
}

function getArchiveUpdateOwnerSocketPath(owner: ArchiveLockOwner): string {
  return join("/tmp", `techgedoens-archive-${owner.pid}-${owner.id}.sock`);
}

async function startArchiveUpdateOwnerServer(owner: ArchiveLockOwner): Promise<Server> {
  const server = createServer((socket) => socket.end());
  await new Promise<void>((resolve, reject) => {
    const handleError = (error: Error) => reject(error);
    server.once("error", handleError);
    server.listen(getArchiveUpdateOwnerSocketPath(owner), () => {
      server.off("error", handleError);
      resolve();
    });
  });
  server.on("error", () => undefined);
  server.unref();
  return server;
}

async function stopArchiveUpdateOwnerServer(server: Server, owner: ArchiveLockOwner): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(getArchiveUpdateOwnerSocketPath(owner), { force: true });
}

async function isArchiveUpdateOwnerAlive(owner: ArchiveLockOwner, isStale: boolean): Promise<boolean> {
  if (!isProcessAlive(owner.pid)) {
    return false;
  }
  if (!isStale) {
    return true;
  }

  const lastSuccessfulProbe = archiveUpdateOwnerProbeCache.get(owner.id);
  if (lastSuccessfulProbe && Date.now() - lastSuccessfulProbe < ARCHIVE_UPDATE_OWNER_PROBE_CACHE_MS) {
    return true;
  }

  const isAlive = await canConnectToArchiveUpdateOwner(owner);
  if (isAlive) {
    archiveUpdateOwnerProbeCache.set(owner.id, Date.now());
  } else {
    archiveUpdateOwnerProbeCache.delete(owner.id);
  }
  return isAlive;
}

async function canConnectToArchiveUpdateOwner(owner: ArchiveLockOwner): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const socket = createConnection(getArchiveUpdateOwnerSocketPath(owner));
    let settled = false;
    const finish = (isAlive: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      resolve(isAlive);
    };
    const timeout = setTimeout(() => finish(false), ARCHIVE_UPDATE_OWNER_PROBE_TIMEOUT_MS);
    timeout.unref();
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function wait(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
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
  await pruneStoredArticleStatuses(new Set(archive.articles.map((article) => article.id)));
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

async function pruneStoredArticleStatuses(activeArticleIds: Set<string>): Promise<void> {
  await pruneArticleStatuses(ARTICLE_READ_STATUS_KEY, activeArticleIds);
  await pruneArticleStatuses(ARTICLE_FAVORITE_STATUS_KEY, activeArticleIds);
}

async function pruneArticleStatuses(key: string, activeArticleIds: Set<string>): Promise<void> {
  const statuses = await readStoredArticleStatuses(key);
  const retainedStatuses = Object.fromEntries(
    Object.entries(statuses).filter(([articleId]) => activeArticleIds.has(articleId)),
  );

  if (Object.keys(retainedStatuses).length === 0) {
    await LocalStorage.removeItem(key);
  } else if (Object.keys(retainedStatuses).length !== Object.keys(statuses).length) {
    await LocalStorage.setItem(key, JSON.stringify(retainedStatuses));
  }
}

function getSerializedByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
