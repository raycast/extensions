import type { GifItem, GifRendition } from "./types";

const API_BASE = "https://api.klipy.com/v2";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === "object"
    ? (value as JsonRecord)
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function firstNonBlank(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function tags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (tag): tag is string => typeof tag === "string" && Boolean(tag.trim()),
    )
    .map((tag) => tag.trim());
}

function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function parseRendition(value: unknown): GifRendition | undefined {
  const data = record(value);
  const url = text(data?.url);
  if (!url) return undefined;
  const dims = Array.isArray(data?.dims) ? data.dims : undefined;
  return {
    url,
    size: number(data?.size),
    width: number(dims?.[0]),
    height: number(dims?.[1]),
  };
}

export function parseKlipyItem(value: unknown): GifItem | undefined {
  const item = record(value);
  if (!item) return undefined;
  const formats = record(item.media_formats) ?? record(item.media);
  const renditions = formats
    ? (Object.values(formats)
        .map(parseRendition)
        .filter(Boolean) as GifRendition[])
    : [];
  const original = parseRendition(formats?.gif) ?? renditions[0];
  const preview =
    parseRendition(formats?.tinygif) ??
    parseRendition(formats?.nanogif) ??
    original;
  const id = text(item.id);
  if (!id || !original || !preview) return undefined;
  const itemTags = tags(item.tags);
  const title = firstNonBlank(
    item.title,
    item.name,
    item.content_description,
    item.description,
    item.slug,
    itemTags[0],
  );
  const description = firstNonBlank(
    item.content_description,
    item.description,
    item.alt_text,
    itemTags.length ? itemTags.join(", ") : undefined,
  );
  return {
    id: `klipy:${id}`,
    title: title ?? "KLIPY GIF",
    description: description && description !== title ? description : undefined,
    source: "klipy",
    previewUrl: preview.url,
    originalUrl: original.url,
    originalSize: original.size,
    renditions,
  };
}

function resultArray(payload: unknown): unknown[] {
  const root = record(payload);
  if (Array.isArray(root?.results)) return root.results;
  if (Array.isArray(root?.data)) return root.data;
  const nested = record(root?.data);
  if (Array.isArray(nested?.results)) return nested.results;
  if (Array.isArray(nested?.data)) return nested.data;
  return [];
}

export async function fetchKlipyGifs(
  query: string,
  preferences: Preferences.SearchGifs,
  signal?: AbortSignal,
): Promise<GifItem[]> {
  const endpoint = query.trim() ? "search" : "featured";
  const params = new URLSearchParams({
    key: preferences.apiKey,
    limit: "36",
    media_filter: "gif,tinygif,nanogif,mediumgif",
    contentfilter: preferences.contentFilter,
  });
  if (query.trim()) params.set("q", query.trim());
  const response = await fetch(`${API_BASE}/${endpoint}?${params}`, { signal });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `KLIPY returned ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`,
    );
  }
  return resultArray(await response.json())
    .map(parseKlipyItem)
    .filter(Boolean) as GifItem[];
}
