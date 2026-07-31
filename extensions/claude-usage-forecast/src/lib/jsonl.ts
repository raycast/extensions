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

const CACHE_VERSION = 3;

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
  /** hourStart epoch ms -> cost USD */
  hours: Record<string, number>;
  /** short hashes of counted message ids, for cross-file dedup */
  ids: string[];
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
  const ids: string[] = [];
  let first: number | null = null;

  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return { hours, ids, first };
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
    // usage is repeated on each, so count a message id + request id pair once.
    const key = `${msgId}:${reqId}`;
    if (key === ":") continue;
    ids.push(shortId(key));

    const cost = costOf(model, tokensFrom(usage));
    if (cost === 0) continue;
    const h = String(hourStart(ts));
    hours[h] = (hours[h] ?? 0) + cost;
  }

  return { hours, ids, first };
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
 * Dedup problem: one file's cached `ids` cannot be re-derived without re-reading
 * it, so ids are cached alongside the hours. When the same message id appears in
 * two files (resumed or forked sessions copy history), the first file wins and
 * the duplicate's cost is subtracted proportionally.
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

    let dupes = 0;
    for (const id of entry.ids) {
      if (seenIds.has(id)) dupes++;
      else seenIds.add(id);
    }
    // Scale this file's cost down by the share of its messages already counted.
    const keepRatio = entry.ids.length === 0 ? 1 : 1 - dupes / entry.ids.length;
    if (keepRatio <= 0) continue;

    for (const [h, cost] of Object.entries(entry.hours)) {
      const hs = Number(h);
      const c = cost * keepRatio;
      hourly.set(hs, (hourly.get(hs) ?? 0) + c);
      const d = localDate(hs);
      daily.set(d, (daily.get(d) ?? 0) + c);
    }
  }

  saveCache(supportPath, { version: CACHE_VERSION, files: nextFiles });

  return { daily, hourly, firstSeen, filesScanned, filesTotal: paths.length };
}
