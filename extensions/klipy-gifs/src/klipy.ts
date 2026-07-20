import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  apiKey: string;
  customerId?: string;
  contentFilter: "high" | "medium" | "low" | "off";
  limit: string;
  gridColumns: "3" | "4" | "5" | "6";
  primaryAction: "copyGifUrl" | "copyGifFile" | "copyMarkdown" | "pasteGifUrl" | "openInBrowser";
}

// --- Klipy API wire types (verified against api.klipy.com/api/v1) ---

type KlipyQuality = "hd" | "md" | "sm" | "xs";

interface KlipyMediaFormat {
  url: string;
  width: number;
  height: number;
  size: number;
}

interface KlipyFileVariant {
  gif?: KlipyMediaFormat;
  webp?: KlipyMediaFormat;
  jpg?: KlipyMediaFormat;
  mp4?: KlipyMediaFormat;
  webm?: KlipyMediaFormat;
}

interface KlipyItem {
  id: number;
  slug: string;
  title: string;
  file: Record<KlipyQuality, KlipyFileVariant>;
  tags?: string[];
  type: "gif" | "ad";
  blur_preview?: string;
}

interface KlipyEnvelope<T> {
  result: boolean;
  data?: T;
  errors?: { message?: string[] } & Record<string, unknown>;
}

interface KlipyListData {
  data: KlipyItem[];
  current_page: number;
  per_page: number;
  has_next: boolean;
}

/** Normalised shape the UI consumes. */
export interface Gif {
  id: string;
  title: string;
  /** Small looping gif used for the grid preview. */
  previewUrl: string;
  /** Full-resolution gif url for copy / paste / download. */
  gifUrl: string;
  /** Browsable link for the "open in browser" action. */
  pageUrl: string;
  width: number;
  height: number;
}

const BASE_URL = "https://api.klipy.com/api/v1";
/** Quality tier used for the copy/paste/download url. */
const FULL_QUALITY_ORDER: KlipyQuality[] = ["md", "hd", "sm", "xs"];
/** Smaller tier used for the fast-loading grid preview. */
const PREVIEW_QUALITY_ORDER: KlipyQuality[] = ["sm", "xs", "md", "hd"];

function preferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

/** Clamp the user-configured limit to Klipy's valid 8-50 range. */
function resolvedLimit(): number {
  const raw = parseInt(preferences().limit, 10);
  if (Number.isNaN(raw)) return 30;
  return Math.min(50, Math.max(8, raw));
}

function pickGif(item: KlipyItem, order: KlipyQuality[]): KlipyMediaFormat | undefined {
  for (const quality of order) {
    const format = item.file?.[quality]?.gif;
    if (format?.url) return format;
  }
  return undefined;
}

function normalize(item: KlipyItem): Gif | null {
  // Klipy interleaves sponsored "ad" items into results; skip them.
  if (item.type !== "gif") return null;

  const full = pickGif(item, FULL_QUALITY_ORDER);
  const preview = pickGif(item, PREVIEW_QUALITY_ORDER);
  if (!full || !preview) return null;

  return {
    id: item.slug || String(item.id),
    title: item.title || item.tags?.[0] || "GIF",
    previewUrl: preview.url,
    gifUrl: full.url,
    pageUrl: full.url,
    width: full.width ?? 0,
    height: full.height ?? 0,
  };
}

/**
 * Build a Klipy endpoint URL. The app key is a path segment (not a query
 * param), matching Klipy's `/{appKey}/gifs/{endpoint}` scheme.
 */
function endpointUrl(endpoint: "search" | "trending", params: Record<string, string>): string {
  const prefs = preferences();
  const url = new URL(`${BASE_URL}/${encodeURIComponent(prefs.apiKey)}/gifs/${endpoint}`);
  const merged: Record<string, string> = {
    page: "1",
    per_page: String(resolvedLimit()),
    format_filter: "gif",
    content_filter: prefs.contentFilter ?? "medium",
    ...(prefs.customerId ? { customer_id: prefs.customerId } : {}),
    ...params,
  };
  for (const [key, value] of Object.entries(merged)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/** Pull Klipy's human-readable reason out of an error envelope, if present. */
function klipyErrorMessage(body: KlipyEnvelope<unknown> | undefined): string | undefined {
  const message = body?.errors?.message;
  if (Array.isArray(message) && message.length) return message.join(" ");
  return undefined;
}

async function request(url: string, signal?: AbortSignal): Promise<Gif[]> {
  const res = await fetch(url, { signal });

  let body: KlipyEnvelope<KlipyListData> | undefined;
  try {
    body = (await res.json()) as KlipyEnvelope<KlipyListData>;
  } catch {
    // Non-JSON response (e.g. gateway error) — handled below.
  }

  // Klipy signals a bad app key with HTTP 404 + result:false, so trust the
  // envelope's message over the status code.
  if (!res.ok || !body || body.result === false) {
    const reason = klipyErrorMessage(body);
    if (reason) throw new Error(reason);
    throw new Error(`Klipy request failed (${res.status}). Check your app key in preferences.`);
  }

  return (body.data?.data ?? []).map(normalize).filter((g): g is Gif => g !== null);
}

/** Trending GIFs, shown when the search box is empty. */
export async function fetchFeatured(signal?: AbortSignal): Promise<Gif[]> {
  return request(endpointUrl("trending", {}), signal);
}

/** Full-text GIF search. */
export async function searchGifs(query: string, signal?: AbortSignal): Promise<Gif[]> {
  const trimmed = query.trim();
  if (!trimmed) return fetchFeatured(signal);
  return request(endpointUrl("search", { q: trimmed }), signal);
}
