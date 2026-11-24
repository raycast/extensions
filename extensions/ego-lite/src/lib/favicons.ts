import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";

export interface FaviconIndex {
  byUrl: ReadonlyMap<string, string>;
  byOrigin: ReadonlyMap<string, string>;
}

export const MAX_FAVICON_BYTES = 64 * 1024;
// Includes the data URI prefix and base64 expansion, rather than binary bytes.
export const MAX_FAVICON_SOURCE_BYTES = 4 * 1024 * 1024;
const MAX_DECODED_BITMAPS = 4096;
const DATA_URI_PREFIX = "data:image/png;base64,";

interface FaviconMetadata {
  pageUrl: string;
  bitmapId: number;
  imageBytes: number;
}

// Stream metadata only. Joining image_data here duplicates shared images for
// every visited URL and can exhaust Raycast's 100 MB extension heap.
const FAVICON_METADATA_QUERY = `
  SELECT mappings.page_url AS pageUrl,
         bitmaps.id AS bitmapId,
         length(bitmaps.image_data) AS imageBytes
  FROM icon_mapping AS mappings
  INNER JOIN favicon_bitmaps AS bitmaps ON bitmaps.icon_id = mappings.icon_id
  WHERE length(bitmaps.image_data) BETWEEN 1 AND ${MAX_FAVICON_BYTES}
    AND bitmaps.width > 0 AND bitmaps.height > 0
  ORDER BY bitmaps.width * bitmaps.height DESC, bitmaps.last_updated DESC;
`;

function emptyIndex(): FaviconIndex {
  return { byUrl: new Map(), byOrigin: new Map() };
}

function normalizedKeys(value: string): { url: string; origin: string } | undefined {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return { url: parsed.href, origin: parsed.origin };
  } catch {
    return undefined;
  }
}

function pngDataUri(image: Uint8Array): string | undefined {
  const bytes = Buffer.from(image.buffer, image.byteOffset, image.byteLength);
  if (bytes.length < 16 || bytes.length > MAX_FAVICON_BYTES) return undefined;
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return undefined;
  if (bytes.subarray(-8).toString("hex") !== "49454e44ae426082") return undefined;
  return DATA_URI_PREFIX + bytes.toString("base64");
}

export function faviconForUrl(index: FaviconIndex, value: string): string | undefined {
  const keys = normalizedKeys(value);
  return keys ? (index.byUrl.get(keys.url) ?? index.byOrigin.get(keys.origin)) : undefined;
}

export async function loadFaviconIndex(databasePath: string, requestedUrls: readonly string[]): Promise<FaviconIndex> {
  const byUrl = new Map<string, string>();
  const byOrigin = new Map<string, string>();
  const wantedUrls = new Set<string>();
  const wantedOrigins = new Set<string>();
  for (const value of requestedUrls) {
    const keys = normalizedKeys(value);
    if (keys) {
      wantedUrls.add(keys.url);
      wantedOrigins.add(keys.origin);
    }
  }
  if (wantedUrls.size === 0 || !existsSync(databasePath)) return { byUrl, byOrigin };

  const databaseUrl = pathToFileURL(databasePath);
  databaseUrl.searchParams.set("immutable", "1");

  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(databaseUrl, { readOnly: true });
    const imageQuery = database.prepare("SELECT image_data AS image FROM favicon_bitmaps WHERE id = ?");
    const sources = new Map<number, string | undefined>();
    let sourceBytes = 0;

    for (const raw of database.prepare(FAVICON_METADATA_QUERY).iterate()) {
      const row = raw as unknown as FaviconMetadata;
      const keys = normalizedKeys(row.pageUrl);
      if (!keys) continue;
      const needsUrl = wantedUrls.has(keys.url) && !byUrl.has(keys.url);
      const needsOrigin = wantedOrigins.has(keys.origin) && !byOrigin.has(keys.origin);
      if (!needsUrl && !needsOrigin) continue;

      if (!sources.has(row.bitmapId)) {
        // Bound both valid images and negative-cache entries. Icons are optional;
        // the command can always use its generated domain avatar instead.
        if (sources.size >= MAX_DECODED_BITMAPS) continue;
        const encodedBytes = DATA_URI_PREFIX.length + 4 * Math.ceil(row.imageBytes / 3);
        if (sourceBytes + encodedBytes > MAX_FAVICON_SOURCE_BYTES) continue;
        const image = imageQuery.get(row.bitmapId)?.image;
        const source = image instanceof Uint8Array ? pngDataUri(image) : undefined;
        sources.set(row.bitmapId, source);
        if (source) sourceBytes += source.length;
      }
      const source = sources.get(row.bitmapId);
      if (!source) continue;

      // Metadata is ranked largest/newest first. Validate before filling a key
      // so an invalid winner still allows a smaller valid image as fallback.
      if (needsUrl) byUrl.set(keys.url, source);
      if (needsOrigin) byOrigin.set(keys.origin, source);
      if (byUrl.size === wantedUrls.size && byOrigin.size === wantedOrigins.size) break;
    }
    return { byUrl, byOrigin };
  } catch {
    return emptyIndex();
  } finally {
    database?.close();
  }
}
