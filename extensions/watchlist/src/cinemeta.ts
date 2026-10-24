/**
 * Cinemeta — Stremio's public, IMDb-backed metadata addon.
 * No API key, no account, no rate-limit headaches.
 */
import { LocalStorage } from "@raycast/api";
import { MediaKind } from "./media-data";

const BASE = "https://v3-cinemeta.strem.io";
const DETAIL_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SearchHit {
  imdbId: string;
  name: string;
  year: string;
  poster: string;
  kind: MediaKind;
  genres: string;
  imdbRating: string;
}

export interface FullMeta extends SearchHit {
  director: string;
  cast: string;
  description: string;
  runtime: string;
  country: string;
  status: string;
}

function typePath(kind: MediaKind): string {
  return kind === "Series" ? "series" : "movie";
}

async function getJson(url: string, timeoutMs = 12000): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function asList(v: unknown): string {
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return typeof v === "string" ? v : "";
}
function asStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}
/** "2022–" / "2024" -> "2022" / "2024" */
function firstYear(v: unknown): string {
  const m = asStr(v).match(/\d{4}/);
  return m ? m[0] : "";
}

function isFullMeta(value: unknown): value is FullMeta {
  if (typeof value !== "object" || value === null) return false;
  if (!("imdbId" in value) || !("kind" in value)) return false;
  const fields = Object.entries(value);
  const stringFields = [
    "name",
    "year",
    "poster",
    "genres",
    "imdbRating",
    "director",
    "cast",
    "description",
    "runtime",
    "country",
    "status",
  ];
  return (
    typeof value.imdbId === "string" &&
    (value.kind === "Movie" || value.kind === "Series") &&
    stringFields.every((key) =>
      fields.some(([name, field]) => name === key && typeof field === "string"),
    )
  );
}

function detailCacheKey(imdbId: string, kind: MediaKind): string {
  return `metadata:${kind}:${imdbId}`;
}

async function cachedDetail(
  imdbId: string,
  kind: MediaKind,
): Promise<FullMeta | null> {
  try {
    const raw = await LocalStorage.getItem<string>(
      detailCacheKey(imdbId, kind),
    );
    if (!raw) return null;
    const cached: unknown = JSON.parse(raw);
    if (
      typeof cached === "object" &&
      cached !== null &&
      "savedAt" in cached &&
      "value" in cached &&
      typeof cached.savedAt === "number" &&
      Date.now() - cached.savedAt < DETAIL_CACHE_TTL &&
      isFullMeta(cached.value)
    ) {
      return cached.value;
    }
  } catch {
    // Ignore an invalid cache entry and fetch fresh metadata.
  }
  return null;
}

export async function search(
  query: string,
  kind: MediaKind,
): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${BASE}/catalog/${typePath(kind)}/top/search=${encodeURIComponent(q)}.json`;
  const data = (await getJson(url)) as { metas?: Record<string, unknown>[] };
  const metas = data?.metas ?? [];
  return metas
    .filter((m) => asStr(m.id).startsWith("tt"))
    .map((m) => ({
      imdbId: asStr(m.id),
      name: asStr(m.name),
      year: firstYear(m.releaseInfo ?? m.year),
      poster: asStr(m.poster),
      kind,
      genres: asList(m.genres),
      imdbRating: asStr(m.imdbRating ?? ""),
    }));
}

export async function detail(
  imdbId: string,
  kind: MediaKind,
  options: { force?: boolean } = {},
): Promise<FullMeta | null> {
  if (!options.force) {
    const cached = await cachedDetail(imdbId, kind);
    if (cached) return cached;
  }
  const url = `${BASE}/meta/${typePath(kind)}/${imdbId}.json`;
  try {
    const data = (await getJson(url)) as { meta?: Record<string, unknown> };
    const m = data?.meta;
    if (!m) return null;
    const result: FullMeta = {
      imdbId,
      kind,
      name: asStr(m.name),
      year: firstYear(m.releaseInfo ?? m.year),
      poster: asStr(m.poster),
      genres: asList(m.genres),
      imdbRating: asStr(m.imdbRating ?? ""),
      director: asList(m.director),
      cast: asList(m.cast),
      description: asStr(m.description),
      runtime: asStr(m.runtime),
      country: asStr(m.country),
      status: asStr(m.status),
    };
    try {
      await LocalStorage.setItem(
        detailCacheKey(imdbId, kind),
        JSON.stringify({ savedAt: Date.now(), value: result }),
      );
    } catch {
      // A cache failure should not hide valid metadata from the user.
    }
    return result;
  } catch {
    return null;
  }
}

export async function clearDetailCache(
  imdbId: string,
  kind: MediaKind,
): Promise<void> {
  await LocalStorage.removeItem(detailCacheKey(imdbId, kind));
}

/** Search both catalogues at once, movies first. */
export async function searchAll(query: string): Promise<SearchHit[]> {
  const [movies, series] = await Promise.all([
    search(query, "Movie").catch(() => [] as SearchHit[]),
    search(query, "Series").catch(() => [] as SearchHit[]),
  ]);
  return [...movies, ...series];
}
