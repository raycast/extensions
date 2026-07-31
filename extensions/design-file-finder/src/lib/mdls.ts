import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { FileRecord } from "./types";

const pexec = promisify(execFile);

/**
 * Parse a raw `mdls -raw -name kMDItemLastUsedDate` value.
 * Formats seen: "2026-06-20 14:32:11 +0000", "(null)", "".
 * Returns epoch ms, or null when absent/unparseable.
 */
export function parseLastUsedRaw(raw: string): number | null {
  const t = raw.trim();
  if (!t || t === "(null)") return null;
  const m = t.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})\s*([+-]\d{2})(\d{2})?/);
  if (!m) {
    const fallback = Date.parse(t);
    return Number.isNaN(fallback) ? null : fallback;
  }
  const tz = m[7] ? `${m[7]}:${m[8] ?? "00"}` : "Z";
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${tz}`;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

async function lastUsedForBatch(records: FileRecord[]): Promise<number> {
  try {
    const { stdout } = await pexec(
      "mdls",
      ["-raw", "-nullMarker", "(null)", "-name", "kMDItemLastUsedDate", ...records.map((record) => record.path)],
      {
        maxBuffer: 1024 * 1024,
      },
    );
    const values = stdout.split("\0");
    let enriched = 0;
    records.forEach((record, index) => {
      const used = parseLastUsedRaw(values[index] ?? "");
      if (used != null) {
        record.lastUsedMs = used;
        enriched++;
      }
    });
    return enriched;
  } catch {
    return 0;
  }
}

/** Run async tasks with a concurrency cap. */
async function mapLimit<T>(items: T[], limit: number, fn: (t: T) => Promise<void>): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

export interface EnrichOptions {
  indexedVolumes: Set<string>;
  batchSize?: number;
  concurrency?: number;
}

export interface EnrichResult {
  /** number of records whose lastUsedMs was set */
  enriched: number;
}

/**
 * Mutates `records` in place, filling `lastUsedMs` for files on indexed volumes.
 * Every candidate is checked so a recently opened file is never missed simply because
 * it was modified a long time ago. Files are sent to `mdls` in bounded batches so large
 * libraries do not launch one process per file.
 */
export async function enrichLastUsed(records: FileRecord[], opts: EnrichOptions): Promise<EnrichResult> {
  const batchSize = opts.batchSize ?? 256;
  const concurrency = opts.concurrency ?? 4;
  const candidates = records.filter((r) => opts.indexedVolumes.has(r.volume));
  const batches = Array.from({ length: Math.ceil(candidates.length / batchSize) }, (_, index) =>
    candidates.slice(index * batchSize, (index + 1) * batchSize),
  );
  let enriched = 0;
  await mapLimit(batches, concurrency, async (batch) => {
    enriched += await lastUsedForBatch(batch);
  });
  return { enriched };
}
