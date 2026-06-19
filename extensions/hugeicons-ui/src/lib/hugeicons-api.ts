import { Cache } from "@raycast/api";
import { ICON_STYLES } from "./constants";
import type { ApiResponse, HugeIcon } from "./types";

export type HugeiconsIconStyle = (typeof ICON_STYLES)[number];
export type SearchStyleValue = "default" | HugeiconsIconStyle;

export interface SearchResultMeta {
  name: string;
  category?: string | null;
  tags: string[];
  styles: HugeiconsIconStyle[];
}

export interface SearchResultIcon extends HugeIcon {
  category?: string | null;
  tags: string[];
  styles: HugeiconsIconStyle[];
  resolvedStyle?: HugeiconsIconStyle;
}

export interface SearchResponseCacheEntry {
  items: SearchResultMeta[];
  page: number;
  totalPages: number;
}

interface RankedIconMeta {
  meta: SearchResultMeta;
  score: number;
  hasDirectMatch: boolean;
}

export const DEFAULT_SEARCH_PAGE_SIZE = 30;
export const DEFAULT_PREVIEW_STYLE: SearchStyleValue = "default";

const SEARCH_RESULTS_CACHE = new Cache({ namespace: "hugeicons-search-results" });
const SVG_CACHE = new Cache({ namespace: "hugeicons-search-svgs", capacity: 25 * 1024 * 1024 });
const LEGACY_STYLE_ALIASES: Record<string, HugeiconsIconStyle> = {
  bulk: "bulk-rounded",
  solid: "solid-rounded",
  twotone: "twotone-rounded",
  duotone: "duotone-rounded",
  stroke: "stroke-rounded",
};
const STYLE_LABELS: Record<SearchStyleValue, string> = {
  default: "All Styles",
  "stroke-standard": "Stroke Standard",
  "solid-standard": "Solid Standard",
  "duotone-standard": "Duotone Standard",
  "stroke-rounded": "Stroke Rounded",
  "solid-rounded": "Solid Rounded",
  "duotone-rounded": "Duotone Rounded",
  "twotone-rounded": "Twotone Rounded",
  "bulk-rounded": "Bulk Rounded",
  "stroke-sharp": "Stroke Sharp",
  "solid-sharp": "Solid Sharp",
};

export class HugeiconsApiError extends Error {
  status: number;
  canOpenPreferences: boolean;

  constructor(status: number, message: string, canOpenPreferences = false) {
    super(message);
    this.name = "HugeiconsApiError";
    this.status = status;
    this.canOpenPreferences = canOpenPreferences;
  }
}

export function isHugeiconsIconStyle(value: string): value is HugeiconsIconStyle {
  return ICON_STYLES.includes(value as HugeiconsIconStyle);
}

export function normalizeHugeiconsIconStyle(value: string | undefined): HugeiconsIconStyle | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) {
    return undefined;
  }

  if (isHugeiconsIconStyle(normalizedValue)) {
    return normalizedValue;
  }

  return LEGACY_STYLE_ALIASES[normalizedValue];
}

export function normalizeSearchStyleValue(value: string | undefined): SearchStyleValue {
  if (!value || value === "default") {
    return DEFAULT_PREVIEW_STYLE;
  }

  return normalizeHugeiconsIconStyle(value) ?? DEFAULT_PREVIEW_STYLE;
}

export function getSearchStyleLabel(style: string | undefined): string {
  return STYLE_LABELS[normalizeSearchStyleValue(style)];
}

export function buildHugeiconsWebsiteUrl(iconName: string): string {
  return `https://hugeicons.com/icon/${encodeURIComponent(iconName)}`;
}

export function normalizeSearchValue(value: string): string {
  return value.toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function compactSearchValue(value: string): string {
  return normalizeSearchValue(value).replace(/\s+/g, "");
}

function getSearchTokens(value: string): string[] {
  return normalizeSearchValue(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function getTagValues(tags: string[] | string | undefined): string[] {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.trim()).filter(Boolean);
  }

  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getNormalizedApiKey(apiKey: string): string {
  const normalizedApiKey = apiKey.trim();

  if (!normalizedApiKey) {
    throw new HugeiconsApiError(401, "Set your Hugeicons API key in Extension Settings.", true);
  }

  return normalizedApiKey;
}

function getApiHeaders(apiKey: string): Record<string, string> {
  const normalizedApiKey = getNormalizedApiKey(apiKey);

  return {
    "x-api-key": normalizedApiKey,
    Authorization: `Bearer ${normalizedApiKey}`,
  };
}

function getResponseItems(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const response = payload as Record<string, unknown>;

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (response.data && typeof response.data === "object") {
    const data = response.data as Record<string, unknown>;

    if (Array.isArray(data.items)) {
      return data.items;
    }

    if (Array.isArray(data.results)) {
      return data.results;
    }

    if (Array.isArray(data.icons)) {
      return data.icons;
    }

    if (typeof data.name === "string") {
      return [data];
    }
  }

  if (Array.isArray(response.results)) {
    return response.results;
  }

  if (Array.isArray(response.icons)) {
    return response.icons;
  }

  return [];
}

function getResponseMeta(payload: unknown): ApiResponse["meta"] | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const response = payload as Record<string, unknown>;

  if (response.meta && typeof response.meta === "object") {
    return response.meta as ApiResponse["meta"];
  }

  if (response.pagination && typeof response.pagination === "object") {
    return response.pagination as ApiResponse["meta"];
  }

  if (response.data && typeof response.data === "object") {
    const data = response.data as Record<string, unknown>;

    if (data.meta && typeof data.meta === "object") {
      return data.meta as ApiResponse["meta"];
    }

    if (data.pagination && typeof data.pagination === "object") {
      return data.pagination as ApiResponse["meta"];
    }
  }

  return undefined;
}

function normalizeSearchMeta(item: unknown): SearchResultMeta | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";

  if (!name) {
    return null;
  }

  const category = typeof record.category === "string" ? record.category : null;
  const tags = getTagValues(record.tags as string[] | string | undefined);
  const styles = Array.isArray(record.styles)
    ? Array.from(
        new Set(
          record.styles
            .filter((style): style is string => typeof style === "string" && style.trim().length > 0)
            .map((style) => normalizeHugeiconsIconStyle(style))
            .filter((style): style is HugeiconsIconStyle => style !== undefined),
        ),
      )
    : [];

  return {
    name,
    category,
    tags,
    styles,
  };
}

function getNormalizedFields(meta: SearchResultMeta) {
  const name = normalizeSearchValue(meta.name);
  const compactName = compactSearchValue(meta.name);
  const nameWords = getSearchTokens(meta.name);
  const category = normalizeSearchValue(meta.category ?? "");
  const tags = meta.tags.map(normalizeSearchValue).filter(Boolean);

  return { name, compactName, nameWords, category, tags };
}

function rankIconMeta(meta: SearchResultMeta, query: string): RankedIconMeta {
  const normalizedQuery = normalizeSearchValue(query);
  const compactQuery = compactSearchValue(query);
  const queryTokens = getSearchTokens(query);
  const { name, compactName, nameWords, category, tags } = getNormalizedFields(meta);

  let score = 0;
  let hasDirectMatch = false;

  if (!normalizedQuery) {
    return { meta, score, hasDirectMatch };
  }

  if (name === normalizedQuery || compactName === compactQuery) {
    score += 1000;
    hasDirectMatch = true;
  }

  if (nameWords.includes(normalizedQuery)) {
    score += 900;
    hasDirectMatch = true;
  }

  if (name.startsWith(normalizedQuery)) {
    score += 750;
    hasDirectMatch = true;
  }

  if (nameWords.some((word) => word.startsWith(normalizedQuery))) {
    score += 650;
    hasDirectMatch = true;
  }

  if (name.includes(normalizedQuery)) {
    score += 550;
    hasDirectMatch = true;
  }

  if (tags.some((tag) => tag === normalizedQuery)) {
    score += 500;
    hasDirectMatch = true;
  }

  if (tags.some((tag) => tag.startsWith(normalizedQuery))) {
    score += 425;
    hasDirectMatch = true;
  }

  if (tags.some((tag) => tag.includes(normalizedQuery))) {
    score += 325;
    hasDirectMatch = true;
  }

  if (category === normalizedQuery) {
    score += 250;
    hasDirectMatch = true;
  }

  if (category.startsWith(normalizedQuery) || category.includes(normalizedQuery)) {
    score += 175;
    hasDirectMatch = true;
  }

  for (const token of queryTokens) {
    if (nameWords.includes(token)) {
      score += 120;
      hasDirectMatch = true;
      continue;
    }

    if (nameWords.some((word) => word.startsWith(token))) {
      score += 90;
      hasDirectMatch = true;
      continue;
    }

    if (name.includes(token)) {
      score += 55;
      hasDirectMatch = true;
      continue;
    }

    if (tags.some((tag) => tag.includes(token))) {
      score += 45;
      hasDirectMatch = true;
      continue;
    }

    if (category.includes(token)) {
      score += 30;
      hasDirectMatch = true;
    }
  }

  score += Math.max(0, 40 - meta.name.length);

  return { meta, score, hasDirectMatch };
}

export function sortSearchResults(items: SearchResultMeta[], query: string): SearchResultMeta[] {
  const uniqueItems = Array.from(new Map(items.map((item) => [item.name, item])).values());
  const rankedItems = uniqueItems.map((meta) => rankIconMeta(meta, query));
  const directMatches = rankedItems.filter((item) => item.hasDirectMatch);
  const activeSet = directMatches.length > 0 ? directMatches : rankedItems;

  return activeSet
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.meta.name.length !== right.meta.name.length) {
        return left.meta.name.length - right.meta.name.length;
      }

      return left.meta.name.localeCompare(right.meta.name);
    })
    .map((item) => item.meta);
}

export function mergeSearchMetas(existing: SearchResultMeta[], incoming: SearchResultMeta[]): SearchResultMeta[] {
  return Array.from(new Map([...existing, ...incoming].map((item) => [item.name, item])).values());
}

export function mergeSearchIcons(existing: SearchResultIcon[], incoming: SearchResultIcon[]): SearchResultIcon[] {
  return Array.from(new Map([...existing, ...incoming].map((item) => [item.name, item])).values());
}

export function filterSearchMetasByStyle(items: SearchResultMeta[], style: SearchStyleValue): SearchResultMeta[] {
  const exactStyle = normalizeHugeiconsIconStyle(style);

  if (!exactStyle) {
    return items;
  }

  return items.filter((item) => item.styles.includes(exactStyle));
}

function buildSearchCacheKey(query: string, page: number, perPage: number): string {
  return `${compactSearchValue(query)}::${page}::${perPage}`;
}

function buildSvgCacheKey(name: string, style?: HugeiconsIconStyle): string {
  return style ? `${name}::${style}` : `${name}::default`;
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

export async function searchIconMetas({
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
  apiKey: string;
  signal: AbortSignal;
  forceRefresh?: boolean;
}): Promise<SearchResponseCacheEntry> {
  const cacheKey = buildSearchCacheKey(query, page, perPage);

  if (!forceRefresh) {
    const cachedEntry = readCacheEntry<SearchResponseCacheEntry>(SEARCH_RESULTS_CACHE, cacheKey);

    if (cachedEntry) {
      return cachedEntry;
    }
  }

  const params = new URLSearchParams({
    q: query,
    page: String(page),
    per_page: String(perPage),
    sort: "relevance",
  });

  let response = await fetch(`https://api.hugeicons.com/v1/search?${params.toString()}`, {
    headers: getApiHeaders(apiKey),
    signal,
  });

  if (response.status === 404 || response.status === 405) {
    response = await fetch(`https://api.hugeicons.com/v1/icons?${params.toString()}`, {
      headers: getApiHeaders(apiKey),
      signal,
    });
  }

  if (response.status === 401 || response.status === 403) {
    throw new HugeiconsApiError(response.status, "The Hugeicons API key is invalid or missing.", true);
  }

  if (response.status === 429) {
    throw new HugeiconsApiError(response.status, "Hugeicons rate limited the request. Please try again in a moment.");
  }

  if (!response.ok) {
    throw new HugeiconsApiError(response.status, `Hugeicons search failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as ApiResponse;
  const items = sortSearchResults(
    getResponseItems(payload)
      .map(normalizeSearchMeta)
      .filter((item): item is SearchResultMeta => item !== null),
    query,
  );
  const meta = getResponseMeta(payload);

  const entry: SearchResponseCacheEntry = {
    items,
    page: meta?.page || page,
    totalPages: meta?.total_pages || 1,
  };

  SEARCH_RESULTS_CACHE.set(cacheKey, JSON.stringify(entry));

  return entry;
}

async function requestSvg({
  name,
  apiKey,
  signal,
  style,
}: {
  name: string;
  apiKey: string;
  signal: AbortSignal;
  style?: HugeiconsIconStyle;
}): Promise<string> {
  const params = new URLSearchParams();

  if (style) {
    params.set("style", style);
  }

  const encodedName = encodeURIComponent(name);
  const response = await fetch(
    `https://api.hugeicons.com/v1/icon/${encodedName}/svg${params.toString() ? `?${params}` : ""}`,
    {
      headers: getApiHeaders(apiKey),
      signal,
    },
  );

  if (response.status === 401 || response.status === 403) {
    throw new HugeiconsApiError(response.status, "The Hugeicons API key is invalid or missing.", true);
  }

  if (response.status === 429) {
    throw new HugeiconsApiError(response.status, "Hugeicons rate limited the request. Please try again in a moment.");
  }

  if (!response.ok) {
    throw new HugeiconsApiError(response.status, `Failed to fetch SVG for ${name}.`);
  }

  return response.text();
}

export async function fetchIconSvgCached({
  name,
  apiKey,
  signal,
  previewStyle,
}: {
  name: string;
  apiKey: string;
  signal: AbortSignal;
  previewStyle: SearchStyleValue;
}): Promise<{ svg: string; resolvedStyle?: HugeiconsIconStyle }> {
  const preferredStyle = previewStyle === "default" ? undefined : previewStyle;

  if (preferredStyle) {
    const styledCacheKey = buildSvgCacheKey(name, preferredStyle);
    const cachedStyledSvg = SVG_CACHE.get(styledCacheKey);

    if (cachedStyledSvg) {
      return { svg: cachedStyledSvg, resolvedStyle: preferredStyle };
    }

    try {
      const styledSvg = await requestSvg({ name, apiKey, signal, style: preferredStyle });
      SVG_CACHE.set(styledCacheKey, styledSvg);

      return { svg: styledSvg, resolvedStyle: preferredStyle };
    } catch (error) {
      if (!(error instanceof HugeiconsApiError) || ![400, 404].includes(error.status)) {
        throw error;
      }
    }
  }

  const defaultCacheKey = buildSvgCacheKey(name);
  const cachedDefaultSvg = SVG_CACHE.get(defaultCacheKey);

  if (cachedDefaultSvg) {
    return { svg: cachedDefaultSvg };
  }

  const defaultSvg = await requestSvg({ name, apiKey, signal });
  SVG_CACHE.set(defaultCacheKey, defaultSvg);

  return { svg: defaultSvg };
}

export async function hydrateIconMetas({
  items,
  apiKey,
  signal,
  previewStyle,
}: {
  items: SearchResultMeta[];
  apiKey: string;
  signal: AbortSignal;
  previewStyle: SearchStyleValue;
}): Promise<SearchResultIcon[]> {
  let fatalError: Error | undefined;

  const hydratedResults = await Promise.all(
    items.map(async (item) => {
      try {
        const { svg, resolvedStyle } = await fetchIconSvgCached({
          name: item.name,
          apiKey,
          signal,
          previewStyle,
        });

        return {
          ...item,
          svg,
          resolvedStyle,
        } as SearchResultIcon;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error;
        }

        if (error instanceof HugeiconsApiError && [401, 403, 429].includes(error.status)) {
          fatalError = error;
        }

        return null;
      }
    }),
  );

  if (fatalError) {
    throw fatalError;
  }

  return hydratedResults.filter((item): item is SearchResultIcon => item !== null);
}

export async function getIconStyles({
  iconName,
  apiKey,
  signal,
}: {
  iconName: string;
  apiKey: string;
  signal: AbortSignal;
}): Promise<Array<{ name: HugeiconsIconStyle; svg: string | null }>> {
  return Promise.all(
    ICON_STYLES.map(async (style) => {
      try {
        const { svg } = await fetchIconSvgCached({
          name: iconName,
          apiKey,
          signal,
          previewStyle: style,
        });

        return { name: style, svg };
      } catch {
        return { name: style, svg: null };
      }
    }),
  );
}
