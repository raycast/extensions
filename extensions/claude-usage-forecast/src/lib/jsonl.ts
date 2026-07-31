/**
 * Scans ~/.claude/projects/**\/*.jsonl for assistant token usage and turns it into
 * per-day and per-hour cost buckets.
 *
 * The transcript tree is large (hundreds of MB), so results are cached per file
 * keyed by (size, mtime). Only files touched since the last run are re-read.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { costOf, emptyTokens } from "./pricing";
import { Tokens, UsageHistory } from "./types";

const CACHE_VERSION = 4;

export function projectsDir(): string {
  const dir =
    process.env.CLAUDE_CONFIG_DIR?.replace(/^~(?=$|\/)/, homedir()) ??
    join(homedir(), ".claude");
  return join(dir, "projects");
}

/** Local calendar date as YYYY-MM-DD. Day-of-week patterns only make sense in local time. */
export function localDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function hourStart(ms: number): number {
  const d = new Date(ms);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

/** Per-model, per-hour aggregation for one transcript file. */
interface FileEntry {
  size: number;
  mtimeMs: number;
  /** hourStart epoch ms -> cost USD (already deduped within the file) */
  hours: Record<string, number>;
  /** shortHash(id) -> { hour, cost } of each *unique* record in this file.
   *  Used to remove a specific duplicate's contribution from `hours`
   *  when the same id was already counted in a newer file. */
  idCosts: Record<string, { h: string; cost: number }>;
  /** earliest record timestamp in this file */
  first: number | null;
}

interface Cache {
  version: number;
  files: Record<string, FileEntry>;
}

function shortId(s: string): string {
  return createHash("sha1").update(s).digest("base64url").slice(0, 8);
}

function walkJsonl(root: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop() as string;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && e.name.endsWith(".jsonl")) out.push(p);
    }
  }
  return out;
}

interface RawUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
}

function tokensFrom(u: RawUsage): Tokens {
  const t = emptyTokens();
  t.input = u.input_tokens ?? 0;
  t.output = u.output_tokens ?? 0;
  t.cacheRead = u.cache_read_input_tokens ?? 0;
  const w5 = u.cache_creation?.ephemeral_5m_input_tokens;
  const w1h = u.cache_creation?.ephemeral_1h_input_tokens;
  if (w5 != null || w1h != null) {
    t.cacheWrite5m = w5 ?? 0;
    t.cacheWrite1h = w1h ?? 0;
  } else {
    // Older transcripts only carry the combined figure; assume the 5m tier.
    t.cacheWrite5m = u.cache_creation_input_tokens ?? 0;
  }
  return t;
}

function parseFile(
  path: string,
  cutoff: number,
): Omit<FileEntry, "size" | "mtimeMs"> {
  const hours: Record<string, number> = {};
  // shortHash(idKey) -> first occurrence, used to collapse intra-file dupes
  // (streaming writes the same msgId+reqId/usage on every delta) and to
  // subtract a record precisely from `hours` when a newer file already
  // counted it (resumed/forked sessions reuse history verbatim).
  const idCosts: Record<string, { h: string; cost: number }> = {};
  let first: number | null = null;

  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return { hours, idCosts, first };
  }

  for (const line of text.split("\n")) {
    // Cheap prefilter: skip the ~70% of lines that cannot carry usage.
    if (line.length < 40 || !line.includes('"usage"')) continue;
    let rec: Record<string, unknown>;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    const msg = rec.message as Record<string, unknown> | undefined;
    if (!msg || msg.role !== "assistant") continue;
    const usage = msg.usage as RawUsage | undefined;
    if (!usage) continue;
    const model = typeof msg.model === "string" ? msg.model : undefined;
    if (!model || model === "<synthetic>") continue;

    const ts =
      typeof rec.timestamp === "string" ? Date.parse(rec.timestamp) : NaN;
    if (!Number.isFinite(ts)) continue;
    if (first === null || ts < first) first = ts;
    if (ts < cutoff) continue;

    const msgId = typeof msg.id === "string" ? msg.id : "";
    const reqId = typeof rec.requestId === "string" ? rec.requestId : "";
    // Streaming writes several lines per API response sharing one message id;
    // usage is repeated on each, so a message id + request id pair counts once.
    // (Intra-file dupes collapse here; cross-file dupes are subtracted later.)
    const key = `${msgId}:${reqId}`;
    if (key === ":") continue;
    const id = shortId(key);
    if (id in idCosts) continue;

    const cost = costOf(model, tokensFrom(usage));
    const h = String(hourStart(ts));
    idCosts[id] = { h, cost };
    if (cost === 0) continue;
    hours[h] = (hours[h] ?? 0) + cost;
  }

  return { hours, idCosts, first };
}

function cachePath(supportPath: string): string {
  return join(supportPath, "jsonl-cache.json");
}

function loadCache(supportPath: string): Cache {
  try {
    const c = JSON.parse(readFileSync(cachePath(supportPath), "utf8")) as Cache;
    if (c.version === CACHE_VERSION && c.files) return c;
  } catch {
    // Fall through to an empty cache.
  }
  return { version: CACHE_VERSION, files: {} };
}

function saveCache(supportPath: string, cache: Cache): void {
  try {
    mkdirSync(dirname(cachePath(supportPath)), { recursive: true });
    const tmp = `${cachePath(supportPath)}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(cache));
    renameSync(tmp, cachePath(supportPath));
  } catch {
    // A failed cache write only costs time on the next run.
  }
}

/**
 * Dedup problem: one file's cached `idCosts` cannot be re-derived without
 * re-reading it, so the per-id {hour, cost} map is cached alongside the hours.
 * When the same message id appears in two files (resumed or forked sessions
 * copy history), the newer file's copy counts in full and the older file's
 * contribution for that exact id is subtracted from its specific hour bucket —
 * rather than scaling the whole file down by a flat ratio, which would also
 * shrink the file's unique records.
 *
 * Files are processed newest-first so the freshest copy of a message is the one
 * that counts.
 */
export function scanUsage(
  supportPath: string,
  lookbackDays: number,
): UsageHistory {
  const root = projectsDir();
  const cutoff = Date.now() - lookbackDays * 86_400_000;
  const cache = loadCache(supportPath);
  const nextFiles: Record<string, FileEntry> = {};

  const daily = new Map<string, number>();
  const hourly = new Map<number, number>();
  let firstSeen: number | null = null;
  let filesScanned = 0;

  if (!existsSync(root)) {
    return { daily, hourly, firstSeen, filesScanned: 0, filesTotal: 0 };
  }

  const paths = walkJsonl(root)
    .map((p) => {
      try {
        const st = statSync(p);
        return { p, size: st.size, mtimeMs: st.mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(
      (x): x is { p: string; size: number; mtimeMs: number } => x !== null,
    )
    // A file untouched since before the cutoff cannot hold in-window records.
    .filter((x) => x.mtimeMs >= cutoff)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const seenIds = new Set<string>();

  for (const { p, size, mtimeMs } of paths) {
    const cached = cache.files[p];
    let entry: FileEntry;
    if (cached && cached.size === size && cached.mtimeMs === mtimeMs) {
      entry = cached;
    } else {
      const parsed = parseFile(p, cutoff);
      entry = { size, mtimeMs, ...parsed };
      filesScanned++;
    }
    nextFiles[p] = entry;

    if (entry.first !== null && (firstSeen === null || entry.first < firstSeen))
      firstSeen = entry.first;

    // Remove each id that a newer file already counted from its exact hour
    // bucket. This subtracts only the duplicates' cost, leaving the file's
    // unique records at full weight (a flat `keepRatio` would shrink them too).
    for (const [id, { h, cost }] of Object.entries(entry.idCosts)) {
      if (seenIds.has(id)) {
        const remaining = (entry.hours[h] ?? 0) - cost;
        if (remaining > 0) entry.hours[h] = remaining;
        else delete entry.hours[h];
      } else {
        seenIds.add(id);
      }
    }

    for (const [h, cost] of Object.entries(entry.hours)) {
      if (cost <= 0) continue;
      const hs = Number(h);
      hourly.set(hs, (hourly.get(hs) ?? 0) + cost);
      const d = localDate(hs);
      daily.set(d, (daily.get(d) ?? 0) + cost);
    }
  }

  saveCache(supportPath, { version: CACHE_VERSION, files: nextFiles });

  return { daily, hourly, firstSeen, filesScanned, filesTotal: paths.length };
}
