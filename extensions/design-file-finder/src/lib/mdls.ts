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

async function lastUsedFor(path: string): Promise<number | null> {
  try {
    const { stdout } = await pexec("mdls", ["-raw", "-name", "kMDItemLastUsedDate", path], {
      maxBuffer: 1024 * 1024,
    });
    return parseLastUsedRaw(stdout);
  } catch {
    return null;
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
  max?: number;
  concurrency?: number;
}

export interface EnrichResult {
  /** number of records whose lastUsedMs was set */
  enriched: number;
  /** true when more indexed candidates existed than the cap allowed */
  capped: boolean;
}

/**
 * Mutates `records` in place, filling `lastUsedMs` for files on indexed volumes.
 * Bounded to the `max` most-recently-modified candidates so a huge library stays fast.
 */
export async function enrichLastUsed(
  records: FileRecord[],
  opts: EnrichOptions,
): Promise<EnrichResult> {
  const max = opts.max ?? 800;
  const concurrency = opts.concurrency ?? 16;
  const candidates = records
    .filter((r) => opts.indexedVolumes.has(r.volume))
    .sort((a, b) => b.modifiedMs - a.modifiedMs);
  const capped = candidates.length > max;
  const slice = candidates.slice(0, max);
  let enriched = 0;
  await mapLimit(slice, concurrency, async (r) => {
    const used = await lastUsedFor(r.path);
    if (used != null) {
      r.lastUsedMs = used;
      enriched++;
    }
  });
  return { enriched, capped };
}
