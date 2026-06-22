import { Metadata } from "./metadata";
import { ReadingEntry, normalizeUrl } from "./utils";

export interface CaptureLine {
  url: string;
  capturedAt: string;
  thoughts?: string;
  rating?: number;
}

export function isValidCapture(value: unknown): value is CaptureLine {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.url === "string" && typeof v.capturedAt === "string";
}

/** Parse JSONL inbox content into valid captures, counting malformed lines. */
export function parseInbox(content: string): {
  captures: CaptureLine[];
  malformed: number;
} {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let malformed = 0;
  const captures: CaptureLine[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (isValidCapture(parsed)) {
        captures.push(parsed);
      } else {
        malformed++;
      }
    } catch (e) {
      malformed++;
    }
  }
  return { captures, malformed };
}

/** Build a schema-valid ReadingEntry from a capture + fetched metadata. */
export function buildEntry(cap: CaptureLine, meta: Metadata): ReadingEntry {
  const entry: ReadingEntry = {
    url: cap.url,
    title: meta.title.trim(),
    author: meta.author ? meta.author.trim() : null,
    publishedDate: meta.publishedDate ? meta.publishedDate.split("T")[0] : null,
    addedDate: cap.capturedAt.split("T")[0],
  };
  if (cap.thoughts && cap.thoughts.trim()) entry.thoughts = cap.thoughts.trim();
  if (typeof cap.rating === "number") entry.rating = cap.rating;
  return entry;
}

/**
 * Merge enriched entries into existing readings: dedup by normalised URL,
 * then full re-sort by addedDate descending. Pure — does no IO.
 */
export function mergeEntries(
  existing: ReadingEntry[],
  enriched: ReadingEntry[],
): { merged: ReadingEntry[]; added: number; duplicates: number } {
  const merged = [...existing];
  const seen = new Set(merged.map((r) => normalizeUrl(r.url)));

  let added = 0;
  let duplicates = 0;
  for (const entry of enriched) {
    const key = normalizeUrl(entry.url);
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    merged.push(entry);
    added++;
  }

  merged.sort(
    (a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime(),
  );

  return { merged, added, duplicates };
}
