import { LocalStorage } from "@raycast/api";
import {
  cacheFavoriteImage,
  removeFavoriteImage,
  validateFavoriteImagePath,
} from "./image-cache";
import type {
  FavoriteReference,
  ImageQuality,
  ImageReference,
  McpImageFormat,
  Platform,
  ReferenceImage,
  ReferenceSource,
  SearchHistoryEntry,
  SearchKind,
  SearchMode,
  SearchOptions,
} from "./types";

const HISTORY_KEY = "mobbin.searchHistory";
const FAVORITES_KEY = "mobbin.favorites";
const STORAGE_VERSION_KEY = "mobbin.storageVersion";
const LEGACY_DEBUG_LOG_KEY = "mobbin.debug.logs";
const STORAGE_VERSION = "2";
const MAX_HISTORY_ENTRIES = 20;
let clearedLegacyDiagnostics = false;

function parseJson(value: string | undefined): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function platformValue(value: unknown): Platform {
  return value === "web" ? "web" : "ios";
}

function modeValue(value: unknown): SearchMode {
  return value === "standard" || value === "fast" ? "standard" : "deep";
}

function qualityValue(value: unknown): ImageQuality {
  return value === "high" ? "high" : "optimized";
}

function formatValue(value: unknown): McpImageFormat {
  return value === "jpg" ? "jpg" : "webp";
}

function kindValue(value: unknown): SearchKind {
  return value === "flow" || value === "section" ? value : "screen";
}

function sourceValue(value: unknown): ReferenceSource {
  return value === "mcp" ? "mcp" : "api";
}

function imageValue(
  value: unknown,
  legacyUrl?: unknown,
): ReferenceImage | undefined {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : undefined;
  const url = stringValue(record?.url) ?? stringValue(legacyUrl);
  const dataUrl = stringValue(record?.dataUrl);
  const localPath = stringValue(record?.localPath);
  if (!url && !dataUrl && !localPath) return undefined;
  const width =
    typeof record?.width === "number" && record.width > 0
      ? record.width
      : undefined;
  const height =
    typeof record?.height === "number" && record.height > 0
      ? record.height
      : undefined;
  const mimeType = stringValue(record?.mimeType);
  const expiresAt = stringValue(record?.expiresAt);
  return {
    ...(url ? { url } : {}),
    ...(dataUrl ? { dataUrl } : {}),
    ...(localPath ? { localPath } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(expiresAt ? { expiresAt } : {}),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };
}

function historyEntry(value: unknown): SearchHistoryEntry | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const query = stringValue(record.query);
  if (!query || query.length > 500) return undefined;
  const limit =
    typeof record.limit === "number" && record.limit >= 1 && record.limit <= 100
      ? record.limit
      : 20;
  const createdAt = stringValue(record.createdAt) ?? new Date(0).toISOString();
  const id = stringValue(record.id) ?? `${createdAt}-${query}`;
  return {
    id,
    query,
    kind: kindValue(record.kind),
    platform: platformValue(record.platform),
    mode: modeValue(record.mode),
    imageQuality: qualityValue(record.imageQuality ?? record.image_quality),
    mcpImageFormat: formatValue(
      record.mcpImageFormat ?? record.mcp_image_format,
    ),
    limit,
    excludeScreenIds: [],
    createdAt,
  };
}

function favoriteEntry(value: unknown): FavoriteReference | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const kind = record.kind === "section" ? "section" : "screen";
  const id = stringValue(record.id);
  const appName = stringValue(record.appName ?? record.app_name);
  const mobbinUrl = stringValue(record.mobbinUrl ?? record.mobbin_url);
  const image = imageValue(record.image, record.image_url);
  if (!id || !appName || !mobbinUrl || !image) return undefined;
  return {
    kind,
    id,
    title: stringValue(record.title) ?? appName,
    appName,
    platform: platformValue(record.platform),
    mobbinUrl,
    source: sourceValue(record.source),
    image,
    favoritedAt: stringValue(record.favoritedAt) ?? new Date(0).toISOString(),
  };
}

async function ensureStorageVersion(): Promise<void> {
  if (!clearedLegacyDiagnostics) {
    await LocalStorage.removeItem(LEGACY_DEBUG_LOG_KEY).catch(() => undefined);
    clearedLegacyDiagnostics = true;
  }
  const version = await LocalStorage.getItem<string>(STORAGE_VERSION_KEY);
  if (version === STORAGE_VERSION) return;

  const rawHistory = parseJson(await LocalStorage.getItem<string>(HISTORY_KEY));
  const history = Array.isArray(rawHistory)
    ? rawHistory.flatMap((value) => {
        const entry = historyEntry(value);
        return entry ? [entry] : [];
      })
    : [];
  const rawFavorites = parseJson(
    await LocalStorage.getItem<string>(FAVORITES_KEY),
  );
  const favorites = Array.isArray(rawFavorites)
    ? rawFavorites.flatMap((value) => {
        const entry = favoriteEntry(value);
        return entry ? [entry] : [];
      })
    : [];

  await Promise.all([
    LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history)),
    LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)),
    LocalStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION),
  ]);
}

export async function getSearchHistory(): Promise<SearchHistoryEntry[]> {
  await ensureStorageVersion();
  const parsed = parseJson(await LocalStorage.getItem<string>(HISTORY_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .flatMap((value) => {
      const entry = historyEntry(value);
      return entry ? [entry] : [];
    })
    .slice(0, MAX_HISTORY_ENTRIES);
}

function historyIdentity(options: SearchOptions): string {
  return JSON.stringify({
    query: options.query.trim().toLowerCase(),
    kind: options.kind,
    platform: options.platform,
    mode: options.mode,
    imageQuality: options.imageQuality,
    mcpImageFormat: options.mcpImageFormat,
    limit: options.limit,
  });
}

export async function addSearchHistory(
  options: SearchOptions,
  signal?: AbortSignal,
): Promise<void> {
  const query = options.query.trim();
  if (!query || query.length > 500) return;
  const history = await getSearchHistory();
  if (signal?.aborted) return;
  const normalized: SearchOptions = {
    ...options,
    query,
    excludeScreenIds: [],
  };
  const now = new Date();
  const entry: SearchHistoryEntry = {
    ...normalized,
    id: `${now.getTime()}-${query}`,
    createdAt: now.toISOString(),
  };
  const identity = historyIdentity(normalized);
  const next = [
    entry,
    ...history.filter((item) => historyIdentity(item) !== identity),
  ].slice(0, MAX_HISTORY_ENTRIES);
  if (signal?.aborted) return;
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export async function clearSearchHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

export async function getFavorites(): Promise<FavoriteReference[]> {
  await ensureStorageVersion();
  const parsed = parseJson(await LocalStorage.getItem<string>(FAVORITES_KEY));
  if (!Array.isArray(parsed)) return [];
  const favorites = parsed.flatMap((value) => {
    const entry = favoriteEntry(value);
    return entry ? [entry] : [];
  });
  return Promise.all(
    favorites.map(async (favorite) => {
      const localPath = favorite.image.localPath
        ? await validateFavoriteImagePath(favorite.image.localPath)
        : undefined;
      const remoteImage = { ...favorite.image };
      delete remoteImage.localPath;
      return {
        ...favorite,
        image: {
          ...remoteImage,
          ...(localPath ? { localPath } : {}),
        },
      };
    }),
  );
}

export async function toggleFavorite(reference: ImageReference): Promise<{
  added: boolean;
  cacheWarning?: string;
  localPath?: string;
}> {
  const favorites = await getFavorites();
  const existing = favorites.find(
    (favorite) =>
      favorite.kind === reference.kind && favorite.id === reference.id,
  );
  if (existing) {
    const next = favorites.filter(
      (favorite) =>
        favorite.kind !== reference.kind || favorite.id !== reference.id,
    );
    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    if (existing.image.localPath)
      await removeFavoriteImage(existing.image.localPath);
    return { added: false };
  }

  let localPath: string | undefined;
  let cacheWarning: string | undefined;
  try {
    localPath = await cacheFavoriteImage(reference);
  } catch {
    cacheWarning =
      "The favorite was saved, but its image could not be stored offline.";
  }

  const favorite: FavoriteReference = {
    ...reference,
    image: {
      ...reference.image,
      ...(localPath ? { localPath } : {}),
    },
    favoritedAt: new Date().toISOString(),
  };
  await LocalStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify([favorite, ...favorites]),
  );
  return {
    added: true,
    ...(localPath ? { localPath } : {}),
    ...(cacheWarning ? { cacheWarning } : {}),
  };
}
