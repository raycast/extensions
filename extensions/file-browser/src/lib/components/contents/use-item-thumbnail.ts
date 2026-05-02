import { useState, useEffect } from "react";
import { getItemThumbnail } from "$lib/ray-fb";
import type { Item } from "$lib/types";

// ── Sizes ───────────────────────────────────────────────────────────
const LIST_THUMBNAIL_SIZE = 40;
const GRID_THUMBNAIL_SIZE = 256;

// ── Concurrency limiter ─────────────────────────────────────────────
const MAX_CONCURRENT = 2;
const queue: (() => void)[] = [];
let activeCount = 0;

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      activeCount++;
      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeCount--;
          const next = queue.shift();
          if (next) next();
        });
    };

    if (activeCount < MAX_CONCURRENT) {
      run();
    } else {
      queue.push(run);
    }
  });
}

// ── In-flight deduplication (not a cache) ───────────────────────────
const inFlight = new Map<string, Promise<string | null>>();

function dedupeKey(path: string, size: number): string {
  return `${path}::${size}`;
}

async function resolveThumbnail(path: string, size: number): Promise<string | null> {
  const key = dedupeKey(path, size);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = enqueue(() =>
    getItemThumbnail({ path, maxSize: size })
      .then((r) => r?.path ?? null)
      .catch(() => null),
  ).finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
}

// ── File-type eligibility ───────────────────────────────────────────
/**
 * UTI prefixes that typically yield useful Quick Look thumbnails.
 * Covers images, documents, media, and archives.
 */
const ELIGIBLE_UTI_PREFIXES = [
  "public.image",
  "public.audio",
  "public.movie",
  "com.adobe.pdf",
  "com.apple.keynote.",
  "com.apple.iwork.",
  "org.openxmlformat.",
  "com.microsoft.word",
  "com.microsoft.excel",
  "com.microsoft.powerpoint",
  "public.composite-content",
  "com.adobe.illustrator",
  "com.adobe.photoshop",
  "org.sketch",
  "com.affinity.",
  "public.svg",
];

/**
 * Well-known filename extensions for image-like or document files
 * that may not have a standard UTI but are worth thumb-nailing.
 */
const ELIGIBLE_EXTENSIONS = new Set([
  // images
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "tiff",
  "tif",
  "webp",
  "ico",
  "heic",
  "heif",
  "avif",
  // documents
  "pdf",
  "sketch",
  "eps",
  "svg",
  // video
  "mp4",
  "mov",
  "avi",
  "mkv",
  "m4v",
  "webm",
  // audio (covers album art)
  "mp3",
  "m4a",
  "flac",
  "wav",
  "aac",
]);

function isEligibleForThumbnail(entry: Item): boolean {
  if (entry.type !== "file") return false;

  const ct = entry.contentType?.toLowerCase() ?? "";
  if (ELIGIBLE_UTI_PREFIXES.some((prefix) => ct.startsWith(prefix))) return true;

  const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
  return ELIGIBLE_EXTENSIONS.has(ext);
}

// ── Hook ────────────────────────────────────────────────────────────
export type ViewMode = "list" | "grid";

// Thresholds above which custom thumbnail loading is suppressed to avoid
// Raycast worker OOM. Grid thumbnails are 256px and far more costly than
// list thumbnails (40px), so grid uses a lower threshold.
const GRID_THUMBNAIL_ENTRY_LIMIT = 100;
const LIST_THUMBNAIL_ENTRY_LIMIT = 500;

export function useItemThumbnail(entry: Item, view: ViewMode, totalEntries?: number): { thumbnail: string | null } {
  const eligible = isEligibleForThumbnail(entry);
  const size = view === "grid" ? GRID_THUMBNAIL_SIZE : LIST_THUMBNAIL_SIZE;

  // Large directories exhaust the Raycast worker memory when every item
  // eagerly requests a Quick Look thumbnail. Suppress custom thumbnails
  // beyond the threshold and let consumers fall back to the file icon.
  const entryLimit = view === "grid" ? GRID_THUMBNAIL_ENTRY_LIMIT : LIST_THUMBNAIL_ENTRY_LIMIT;
  const suppressed = totalEntries != null && totalEntries > entryLimit;

  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (!eligible || suppressed) {
      setThumbnail(null);
      return;
    }

    let cancelled = false;
    resolveThumbnail(entry.path, size).then((result) => {
      if (!cancelled) setThumbnail(result);
    });

    return () => {
      cancelled = true;
    };
  }, [entry.path, size, eligible, suppressed]);

  return { thumbnail };
}
