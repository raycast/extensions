import { Cache } from "@raycast/api";
import hugeiconsMetadata from "../../assets/hugeicons-metadata.json";
import { ICON_STYLES } from "./constants";
import {
  DEFAULT_PREVIEW_STYLE,
  DEFAULT_SEARCH_PAGE_SIZE,
  fetchIconSvgCached,
  getIconStyles,
  hydrateIconMetas,
  HugeiconsApiError,
  normalizeSearchValue,
  searchIconMetas,
  sortSearchResults,
  type HugeiconsIconStyle,
  type SearchResponseCacheEntry,
  type SearchResultIcon,
  type SearchResultMeta,
  type SearchStyleValue,
} from "./hugeicons-api";

type FreeIconMetadata = {
  name: string;
  displayName: string;
  svg: string;
  reactComponent?: string;
};

type FreeIconEntry = {
  sourceName: string;
  name: string;
  displayName: string;
  svg: string;
  tags: string[];
  styles: HugeiconsIconStyle[];
};

const FREE_STYLE: HugeiconsIconStyle = "stroke-rounded";
const FREE_RESULTS_CACHE = new Cache({ namespace: "hugeicons-free-search-results" });

function hasNonEmptyValue(value?: string): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildFreeSearchCacheKey(query: string, page: number, perPage: number): string {
  return `${normalizeSearchValue(query)}::${page}::${perPage}`;
}

function readCacheEntry<T>(cache: Cache, key: string): T | undefined {
  const value = cache.get(key);

  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    cache.remove(key);
    return undefined;
  }
}

function toIconSlug(sourceName: string, displayName: string): string {
  const fromDisplayName = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (fromDisplayName.length > 0) {
    return fromDisplayName;
  }

  return sourceName
    .replace(/Icon$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Za-z])([0-9]+)/g, "$1-$2")
    .replace(/([0-9])([A-Za-z])/g, "$1-$2")
    .toLowerCase();
}

function buildTags(entry: Pick<FreeIconEntry, "name" | "displayName">): string[] {
  const tokens = normalizeSearchValue(`${entry.name} ${entry.displayName}`)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);

  return Array.from(new Set(tokens));
}

function toFreeEntry(entry: FreeIconMetadata): FreeIconEntry {
  const name = toIconSlug(entry.name, entry.displayName);
  const freeEntry: FreeIconEntry = {
    sourceName: entry.name,
    name,
    displayName: entry.displayName,
    svg: entry.svg,
    tags: [],
    styles: [FREE_STYLE],
  };

  freeEntry.tags = buildTags(freeEntry);
  return freeEntry;
}

const FREE_ICON_ENTRIES = Array.from(
  new Map(
    Object.values(hugeiconsMetadata as Record<string, FreeIconMetadata>).map((entry) => {
      const normalizedEntry = toFreeEntry(entry);
      return [normalizedEntry.name, normalizedEntry] as const;
    }),
  ).values(),
);

const FREE_ICON_MAP = new Map(FREE_ICON_ENTRIES.map((entry) => [entry.name, entry]));
const FREE_ICON_METAS: SearchResultMeta[] = FREE_ICON_ENTRIES.map((entry) => ({
  name: entry.name,
  category: "Free",
  tags: entry.tags,
  styles: entry.styles,
}));

export function hasHugeiconsProAccess(apiKey?: string): apiKey is string {
  return hasNonEmptyValue(apiKey);
}

export function getHugeiconsSourceMode(apiKey?: string): "free" | "pro" {
  return hasHugeiconsProAccess(apiKey) ? "pro" : "free";
}

export function getHugeiconsSourceLabel(apiKey?: string): "Free" | "Pro" {
  return hasHugeiconsProAccess(apiKey) ? "Pro" : "Free";
}

export function isFreeHugeiconsStyle(style: SearchStyleValue): boolean {
  return style === DEFAULT_PREVIEW_STYLE || style === FREE_STYLE;
}

export async function searchHugeiconsMetas({
  query,
  page = 1,
  perPage = DEFAULT_SEARCH_PAGE_SIZE,
  apiKey,
  signal,
  forceRefresh = false,
}: {
  query: string;
  page?: number;
  perPage?: number;
  apiKey?: string;
  signal: AbortSignal;
  forceRefresh?: boolean;
}): Promise<SearchResponseCacheEntry> {
  if (hasHugeiconsProAccess(apiKey)) {
    try {
      return await searchIconMetas({ query, page, perPage, apiKey, signal, forceRefresh });
    } catch (error) {
      if (!(error instanceof HugeiconsApiError) || ![401, 403].includes(error.status)) {
        throw error;
      }
    }
  }

  if (signal.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  const cacheKey = buildFreeSearchCacheKey(query, page, perPage);

  if (!forceRefresh) {
    const cachedEntry = readCacheEntry<SearchResponseCacheEntry>(FREE_RESULTS_CACHE, cacheKey);

    if (cachedEntry) {
      return cachedEntry;
    }
  }

  const rankedItems = sortSearchResults(FREE_ICON_METAS, query);
  const totalPages = Math.max(1, Math.ceil(rankedItems.length / perPage));
  const startIndex = Math.max(page - 1, 0) * perPage;
  const entry: SearchResponseCacheEntry = {
    items: rankedItems.slice(startIndex, startIndex + perPage),
    page,
    totalPages,
  };

  FREE_RESULTS_CACHE.set(cacheKey, JSON.stringify(entry));

  return entry;
}

export async function hydrateHugeiconsMetas({
  items,
  apiKey,
  signal,
  previewStyle,
}: {
  items: SearchResultMeta[];
  apiKey?: string;
  signal: AbortSignal;
  previewStyle: SearchStyleValue;
}): Promise<SearchResultIcon[]> {
  if (hasHugeiconsProAccess(apiKey)) {
    try {
      return await hydrateIconMetas({ items, apiKey, signal, previewStyle });
    } catch (error) {
      if (!(error instanceof HugeiconsApiError) || ![401, 403].includes(error.status)) {
        throw error;
      }
    }
  }

  if (signal.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  if (!isFreeHugeiconsStyle(previewStyle)) {
    return [];
  }

  return items
    .map((item) => {
      const freeEntry = FREE_ICON_MAP.get(item.name);

      if (!freeEntry) {
        return null;
      }

      return {
        ...item,
        svg: freeEntry.svg,
      } satisfies SearchResultIcon;
    })
    .filter((item): item is SearchResultIcon => item !== null);
}

export async function fetchHugeiconsSvg({
  name,
  apiKey,
  signal,
  previewStyle,
}: {
  name: string;
  apiKey?: string;
  signal: AbortSignal;
  previewStyle: SearchStyleValue;
}): Promise<{ svg: string; resolvedStyle?: HugeiconsIconStyle }> {
  if (hasHugeiconsProAccess(apiKey)) {
    try {
      return await fetchIconSvgCached({ name, apiKey, signal, previewStyle });
    } catch (error) {
      if (!(error instanceof HugeiconsApiError) || ![401, 403].includes(error.status)) {
        throw error;
      }
    }
  }

  if (signal.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  const freeEntry = FREE_ICON_MAP.get(name);

  if (!freeEntry) {
    throw new Error(`Free Hugeicons icon not found: ${name}`);
  }

  if (previewStyle === FREE_STYLE) {
    return { svg: freeEntry.svg, resolvedStyle: FREE_STYLE };
  }

  return { svg: freeEntry.svg };
}

export async function getHugeiconsIconStyles({
  iconName,
  apiKey,
  signal,
}: {
  iconName: string;
  apiKey?: string;
  signal: AbortSignal;
}): Promise<Array<{ name: HugeiconsIconStyle; svg: string | null }>> {
  if (hasHugeiconsProAccess(apiKey)) {
    try {
      return await getIconStyles({ iconName, apiKey, signal });
    } catch (error) {
      if (!(error instanceof HugeiconsApiError) || ![401, 403].includes(error.status)) {
        throw error;
      }
    }
  }

  if (signal.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  const freeEntry = FREE_ICON_MAP.get(iconName);

  return ICON_STYLES.map((style) => ({
    name: style,
    svg: style === FREE_STYLE ? (freeEntry?.svg ?? null) : null,
  }));
}
