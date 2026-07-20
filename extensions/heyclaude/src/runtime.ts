import {
  FEED_URL,
  absoluteDataUrl,
  buildFeedSnapshotMetadata,
  detailCacheKey,
  fallbackDetail,
  feedCacheKey,
  feedMetadataCacheKey,
  hasValidDiscoveryEntries,
  isRaycastDetail,
  parseFeed,
  parseFeedSnapshotMetadata,
  parseRecentUpdatesFeed,
  parseRegistryManifestSnapshot,
  parseRegistrySearch,
  parseTrendingFeed,
  recentUpdatesCacheKey,
  recentUpdatesFeedUrl,
  registryManifestUrl,
  registrySearchUrl,
  resolveFeedUrl,
  trendingCacheKey,
  trendingFeedUrl,
  type FeedSnapshotMetadata,
  type ParsedFeed,
  type ParsedRegistrySearch,
  type ParsedRecentUpdatesFeed,
  type ParsedTrendingFeed,
  type RaycastDetail,
  type RaycastEntry,
  type RegistryManifestSnapshot,
} from "./feed";

export type RaycastTextCache = {
  get: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
};

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function loadCachedFeedMetadata(
  cache: RaycastTextCache,
  feedUrl = FEED_URL,
): FeedSnapshotMetadata | null {
  return parseFeedSnapshotMetadata(cache.get(feedMetadataCacheKey(feedUrl)));
}

function saveFeedSnapshotMetadata(
  cache: RaycastTextCache,
  feedUrl: string,
  metadata: FeedSnapshotMetadata,
) {
  cache.set(feedMetadataCacheKey(feedUrl), JSON.stringify(metadata));
}

function enrichFeedWithMetadata(
  feed: ParsedFeed,
  metadata: FeedSnapshotMetadata | null,
): ParsedFeed {
  if (!metadata) return feed;
  return {
    ...feed,
    generatedAt: metadata.generatedAt || feed.generatedAt,
    signature: metadata.signature,
  };
}

export function loadCachedFeed(
  cache: RaycastTextCache,
  feedUrl = FEED_URL,
): ParsedFeed {
  const cacheKey = feedCacheKey(feedUrl);
  const cached = cache.get(cacheKey);
  if (!cached) return { entries: [], generatedAt: "" };

  try {
    return enrichFeedWithMetadata(
      parseFeed(cached),
      loadCachedFeedMetadata(cache, feedUrl),
    );
  } catch {
    cache.remove(cacheKey);
    cache.remove(feedMetadataCacheKey(feedUrl));
    return { entries: [], generatedAt: "" };
  }
}

export function loadCachedTrending(
  cache: RaycastTextCache,
  feedUrl = FEED_URL,
): ParsedTrendingFeed {
  const cacheKey = trendingCacheKey(feedUrl);
  const cached = cache.get(cacheKey);
  if (!cached) {
    return { entries: [], category: "all", platform: "all", generatedAt: "" };
  }

  try {
    return parseTrendingFeed(cached);
  } catch {
    cache.remove(cacheKey);
    return { entries: [], category: "all", platform: "all", generatedAt: "" };
  }
}

export function loadCachedRecentUpdates(
  cache: RaycastTextCache,
  feedUrl = FEED_URL,
): ParsedRecentUpdatesFeed {
  const cacheKey = recentUpdatesCacheKey(feedUrl);
  const cached = cache.get(cacheKey);
  if (!cached) return { entries: [], generatedAt: "", currentSignature: "" };

  try {
    return parseRecentUpdatesFeed(cached);
  } catch {
    cache.remove(cacheKey);
    return { entries: [], generatedAt: "", currentSignature: "" };
  }
}

async function fetchRegistryManifestSnapshot(
  fetchFn: FetchLike,
  feedUrl: string,
): Promise<RegistryManifestSnapshot | null> {
  const response = await fetchFn(registryManifestUrl(feedUrl), {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Registry manifest responded with ${response.status}`);
  }

  const snapshot = parseRegistryManifestSnapshot(await response.text());
  if (!snapshot) {
    throw new Error("Registry manifest payload was malformed");
  }
  return snapshot;
}

function isSameFeedSnapshot(
  cachedMetadata: FeedSnapshotMetadata | null,
  manifestSnapshot: RegistryManifestSnapshot,
) {
  return Boolean(
    cachedMetadata?.signature &&
    cachedMetadata.signature === manifestSnapshot.signature,
  );
}

function removeDetailCacheForSnapshot(options: {
  cache: RaycastTextCache;
  entries: RaycastEntry[];
  feedUrl: string;
  detailCacheNamespace: string;
}) {
  for (const entry of options.entries) {
    options.cache.remove(
      detailCacheKey(entry, options.feedUrl, options.detailCacheNamespace),
    );
  }
}

function invalidateDetailCacheWhenSnapshotChanges(options: {
  cache: RaycastTextCache;
  entries: RaycastEntry[];
  feedUrl: string;
  previousMetadata: FeedSnapshotMetadata | null;
  nextMetadata: FeedSnapshotMetadata;
}) {
  const previousNamespace =
    options.previousMetadata?.detailCacheNamespace || "";
  if (previousNamespace === options.nextMetadata.detailCacheNamespace) return;

  removeDetailCacheForSnapshot({
    cache: options.cache,
    entries: options.entries,
    feedUrl: options.feedUrl,
    detailCacheNamespace: previousNamespace,
  });
}

function isFeedPayloadValidationError(error: unknown) {
  return (
    error instanceof SyntaxError ||
    (error instanceof Error && error.message === "Feed contained no entries")
  );
}

async function fetchFeedPayload(
  fetchFn: FetchLike,
  feedUrl: string,
): Promise<string> {
  const response = await fetchFn(feedUrl, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Feed responded with ${response.status}`);
  }
  return response.text();
}

async function fetchDiscoveryPayload(
  fetchFn: FetchLike,
  url: string,
  label: string,
): Promise<string> {
  const response = await fetchFn(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`${label} responded with ${response.status}`);
  }
  const text = await response.text();
  if (!hasValidDiscoveryEntries(text)) {
    throw new Error(`${label} payload was malformed`);
  }
  return text;
}

export async function fetchFreshTrending(options: {
  cache: RaycastTextCache;
  fetchFn?: FetchLike;
  feedUrl?: string;
  limit?: number;
}) {
  const fetchFn = options.fetchFn ?? fetch;
  const feedUrl = resolveFeedUrl(options.feedUrl);
  const cacheKey = trendingCacheKey(feedUrl);
  const cached = loadCachedTrending(options.cache, feedUrl);

  try {
    const text = await fetchDiscoveryPayload(
      fetchFn,
      trendingFeedUrl(feedUrl, options.limit),
      "Trending feed",
    );
    const nextFeed = parseTrendingFeed(text);
    options.cache.set(cacheKey, text);
    return { ...nextFeed, refreshStatus: "updated" as const };
  } catch (error) {
    if (cached.entries.length > 0) {
      return {
        ...cached,
        refreshStatus: "stale" as const,
        refreshWarning: error instanceof Error ? error.message : String(error),
      };
    }
    throw error;
  }
}

export async function fetchFreshRecentUpdates(options: {
  cache: RaycastTextCache;
  fetchFn?: FetchLike;
  feedUrl?: string;
  limit?: number;
}) {
  const fetchFn = options.fetchFn ?? fetch;
  const feedUrl = resolveFeedUrl(options.feedUrl);
  const cacheKey = recentUpdatesCacheKey(feedUrl);
  const cached = loadCachedRecentUpdates(options.cache, feedUrl);

  try {
    const text = await fetchDiscoveryPayload(
      fetchFn,
      recentUpdatesFeedUrl(feedUrl, options.limit),
      "Recent updates feed",
    );
    const nextFeed = parseRecentUpdatesFeed(text);
    options.cache.set(cacheKey, text);
    return { ...nextFeed, refreshStatus: "updated" as const };
  } catch (error) {
    if (cached.entries.length > 0) {
      return {
        ...cached,
        refreshStatus: "stale" as const,
        refreshWarning: error instanceof Error ? error.message : String(error),
      };
    }
    throw error;
  }
}

export async function fetchFreshFeed(options: {
  cache: RaycastTextCache;
  fetchFn?: FetchLike;
  feedUrl?: string;
}) {
  const fetchFn = options.fetchFn ?? fetch;
  const feedUrl = resolveFeedUrl(options.feedUrl);
  const cachedFeed = loadCachedFeed(options.cache, feedUrl);
  const cachedMetadata = loadCachedFeedMetadata(options.cache, feedUrl);
  let manifestSnapshot: RegistryManifestSnapshot | null = null;
  let manifestError: Error | null = null;

  try {
    manifestSnapshot = await fetchRegistryManifestSnapshot(fetchFn, feedUrl);
    if (
      cachedFeed.entries.length > 0 &&
      manifestSnapshot &&
      isSameFeedSnapshot(cachedMetadata, manifestSnapshot)
    ) {
      const metadata = buildFeedSnapshotMetadata(cachedFeed, manifestSnapshot);
      saveFeedSnapshotMetadata(options.cache, feedUrl, metadata);
      return {
        ...enrichFeedWithMetadata(cachedFeed, metadata),
        refreshStatus: "unchanged" as const,
      };
    }
  } catch (error) {
    manifestError = error instanceof Error ? error : new Error(String(error));
  }

  try {
    const text = await fetchFeedPayload(fetchFn, feedUrl);
    const nextFeed = parseFeed(text);
    if (nextFeed.entries.length === 0) {
      throw new Error("Feed contained no entries");
    }

    const nextMetadata = buildFeedSnapshotMetadata(nextFeed, manifestSnapshot);
    options.cache.set(feedCacheKey(feedUrl), text);
    saveFeedSnapshotMetadata(options.cache, feedUrl, nextMetadata);
    invalidateDetailCacheWhenSnapshotChanges({
      cache: options.cache,
      entries: nextFeed.entries,
      feedUrl,
      previousMetadata: cachedMetadata,
      nextMetadata,
    });
    return {
      ...enrichFeedWithMetadata(nextFeed, nextMetadata),
      refreshStatus: "updated" as const,
    };
  } catch (error) {
    if (
      cachedFeed.entries.length > 0 &&
      manifestError &&
      !isFeedPayloadValidationError(error)
    ) {
      return {
        ...cachedFeed,
        refreshStatus: "stale" as const,
        refreshWarning: manifestError.message,
      };
    }
    throw error;
  }
}

export async function fetchRegistrySearch(options: {
  query: string;
  category?: string;
  limit?: number;
  offset?: number;
  searchUrl?: string;
  fetchFn?: FetchLike;
}): Promise<ParsedRegistrySearch> {
  const fetchFn = options.fetchFn ?? fetch;
  const requestUrl = registrySearchUrl({
    query: options.query,
    category: options.category,
    limit: options.limit,
    offset: options.offset,
    searchUrl: options.searchUrl,
  });
  const response = await fetchFn(requestUrl, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Registry search responded with ${response.status}`);
  }
  return parseRegistrySearch(await response.text());
}

export async function loadEntryDetail(options: {
  entry: RaycastEntry;
  cache: RaycastTextCache;
  fetchFn?: FetchLike;
  feedUrl?: string;
}): Promise<RaycastDetail> {
  const { entry, cache } = options;
  if (!entry.detailUrl) return fallbackDetail(entry);

  const feedUrl = resolveFeedUrl(options.feedUrl);
  const metadata = loadCachedFeedMetadata(cache, feedUrl);
  const cacheKey = detailCacheKey(
    entry,
    feedUrl,
    metadata?.detailCacheNamespace,
  );
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as unknown;
      if (isRaycastDetail(parsed)) return parsed;
    } catch {
      cache.remove(cacheKey);
    }
  }

  const fetchFn = options.fetchFn ?? fetch;
  const response = await fetchFn(absoluteDataUrl(entry.detailUrl, feedUrl), {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Detail responded with ${response.status}`);
  }

  const parsed = (await response.json()) as unknown;
  if (!isRaycastDetail(parsed)) {
    throw new Error("Detail payload was malformed");
  }

  const hydrated = await hydrateDetailCopyText({
    detail: parsed,
    entry,
    feedUrl,
    fetchFn,
  });
  cache.set(cacheKey, JSON.stringify(hydrated));
  return hydrated;
}

async function hydrateDetailCopyText(options: {
  detail: RaycastDetail;
  entry: RaycastEntry;
  feedUrl: string;
  fetchFn: FetchLike;
}): Promise<RaycastDetail> {
  if (options.detail.copyText?.trim()) return options.detail;
  const copyTextUrl = options.detail.llmsUrl || options.entry.llmsUrl;
  if (!copyTextUrl) {
    return {
      ...options.detail,
      copyText: fallbackDetail(options.entry).copyText,
    };
  }
  const response = await options.fetchFn(
    absoluteDataUrl(copyTextUrl, options.feedUrl),
    {
      headers: { accept: "text/plain" },
    },
  );
  if (!response.ok) {
    throw new Error(`Copy text responded with ${response.status}`);
  }
  const copyText = await response.text();
  return {
    ...options.detail,
    copyText: copyText.trim() || fallbackDetail(options.entry).copyText,
  };
}
