import * as fs from "fs";
import * as path from "path";
import { getAdapter, isMeaningfulUserMessage } from "../adapters";
import { buildSnippet } from "../format";
import { DEFAULT_MAX_JSONL_LINE_BYTES, readJsonlLines } from "../load-messages";
import { warn } from "../logger";
import { ensureRipgrep, execRipgrep } from "../ripgrep";
import { pathExists } from "../scanners/util";
import type { SessionMeta, SessionSource } from "../types";
import { sessionKeyOf } from "./keys";

/**
 * One full-text hit. `msgIndex` is the index into `loadSessionMessages(meta)` for the
 * matched session — this is the *seq contract*: a content-index segment line number
 * always equals the corresponding message's array index (both walk the same adapter +
 * `isMeaningfulUserMessage` filter). The detail view uses it to jump straight to the hit.
 */
export interface IndexedMessageHit {
  sessionKey: string;
  msgIndex: number;
  snippet: string;
}

export interface DirtySet {
  changedKeys: string[];
  removedKeys: string[];
}

export interface OffsetEntry {
  startLine: number;
  msgCount: number;
  filePath: string;
  source: SessionSource;
}

interface OffsetsFile {
  version: 1;
  entries: Record<string, OffsetEntry>;
}

/** Map `claude:<id>` / `codex:<id>` to a safe filename. */
export function safeSegmentName(sessionKey: string): string {
  return sessionKey.replace(/[^A-Za-z0-9_-]/g, "_") + ".txt";
}

function segmentPath(cacheDir: string, sessionKey: string): string {
  return path.join(cacheDir, "segments", safeSegmentName(sessionKey));
}

/**
 * Rebuild one session's segment file. Each line is `<msgIndex>\t<text-with-newlines-flattened>`.
 * The filter must stay byte-for-byte identical to `loadSessionMessages` (see the seq contract).
 */
export async function rebuildSegment(cacheDir: string, sessionKey: string, meta: SessionMeta): Promise<void> {
  const adapter = getAdapter(meta.source);
  const lines: string[] = [];
  let idx = 0;

  try {
    for await (const rawLine of readJsonlLines(meta.filePath, DEFAULT_MAX_JSONL_LINE_BYTES)) {
      if (!rawLine.trim()) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawLine);
      } catch {
        continue;
      }
      const msg = adapter.parseLine(parsed);
      if (!msg) continue;
      if (msg.role === "user" && !isMeaningfulUserMessage(msg.content)) continue;
      lines.push(`${idx}\t${msg.content.replace(/\r?\n/g, " ")}`);
      idx++;
    }
  } catch (e) {
    warn(`content-index: failed to read session ${meta.filePath}:`, e);
  }

  const segPath = segmentPath(cacheDir, sessionKey);
  await fs.promises.mkdir(path.dirname(segPath), { recursive: true });
  await fs.promises.writeFile(segPath, lines.length ? lines.join("\n") + "\n" : "");
}

async function removeSegment(cacheDir: string, sessionKey: string): Promise<void> {
  try {
    await fs.promises.rm(segmentPath(cacheDir, sessionKey), { force: true });
  } catch {
    // ignore
  }
}

function readOffsets(cacheDir: string): OffsetsFile {
  try {
    const raw = fs.readFileSync(path.join(cacheDir, "offsets.json"), "utf-8");
    const parsed = JSON.parse(raw) as OffsetsFile;
    if (!parsed || parsed.version !== 1 || !parsed.entries) return { version: 1, entries: {} };
    return parsed;
  } catch {
    return { version: 1, entries: {} };
  }
}

/**
 * Bring the merged content index up to date with `metas`:
 * - rebuild segments for new / changed / (removed-but-still-present) sessions
 * - drop segments for truly gone sessions
 * - if anything changed, re-stitch `messages.txt` and `offsets.json` (order by key so
 *   global line numbers are stable across incremental updates)
 */
export async function ensureContentIndex(cacheDir: string, metas: SessionMeta[], dirty: DirtySet): Promise<void> {
  const offsets = readOffsets(cacheDir);
  const knownKeys = new Set(Object.keys(offsets.entries));
  const metasByKey = new Map<string, SessionMeta>();
  const allKeys = new Set<string>();
  for (const meta of metas) {
    const key = sessionKeyOf(meta);
    metasByKey.set(key, meta);
    allKeys.add(key);
  }

  const dirtySet = new Set([...dirty.changedKeys, ...dirty.removedKeys]);
  const needRebuild = new Set<string>();

  for (const key of allKeys) {
    if (!knownKeys.has(key) || dirtySet.has(key)) needRebuild.add(key);
  }
  // Sessions that vanished entirely (present in the index, absent from `metas`).
  for (const key of knownKeys) {
    if (!allKeys.has(key) && dirtySet.has(key)) needRebuild.add(key);
  }

  if (needRebuild.size === 0) return;

  for (const key of needRebuild) {
    const meta = metasByKey.get(key);
    if (meta) await rebuildSegment(cacheDir, key, meta);
    else await removeSegment(cacheDir, key);
  }

  await regenerateMessagesFile(cacheDir, metas, allKeys);
}

async function regenerateMessagesFile(cacheDir: string, metas: SessionMeta[], allKeys: Set<string>): Promise<void> {
  const ordered = metas
    .filter((m) => allKeys.has(sessionKeyOf(m)))
    .sort((a, b) => sessionKeyOf(a).localeCompare(sessionKeyOf(b)));

  const entries: Record<string, OffsetEntry> = {};
  const chunks: string[] = [];
  let startLine = 1; // rg -n line numbers are 1-based

  for (const meta of ordered) {
    const key = sessionKeyOf(meta);
    let text = "";
    try {
      text = await fs.promises.readFile(segmentPath(cacheDir, key), "utf-8");
    } catch {
      continue;
    }
    const msgCount = text === "" ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
    entries[key] = { startLine, msgCount, filePath: meta.filePath, source: meta.source };
    chunks.push(text);
    startLine += msgCount;
  }

  await fs.promises.mkdir(path.join(cacheDir, "segments"), { recursive: true });
  await fs.promises.writeFile(path.join(cacheDir, "messages.txt"), chunks.join(""));
  await fs.promises.writeFile(path.join(cacheDir, "offsets.json"), JSON.stringify({ version: 1, entries }));
}

/**
 * Full-text search over the merged index. `ensureContentIndex` must have been called
 * (or the index may be stale for dirty sessions).
 */
export async function searchContentIndex(cacheDir: string, query: string, limit: number): Promise<IndexedMessageHit[]> {
  if (!query.trim() || query.length < 2 || limit <= 0) return [];
  const messagesPath = path.join(cacheDir, "messages.txt");
  if (!(await pathExists(messagesPath))) return [];

  const offsets = readOffsets(cacheDir);
  if (Object.keys(offsets.entries).length === 0) return [];

  const rgPath = await ensureRipgrep();
  const output = await execRipgrep(rgPath, buildSearchArgs(query, limit, messagesPath));

  return parseRgOutput(output, offsets.entries, query, limit);
}

/** rg args for a single-file content search. Exported for unit tests. */
export function buildSearchArgs(query: string, limit: number, messagesPath: string): string[] {
  return [
    "--fixed-strings",
    "--ignore-case",
    "--max-count",
    String(limit),
    "--no-heading",
    "--line-number",
    "--",
    query,
    messagesPath,
  ];
}

/**
 * Parse `rg --line-number` output into hits, mapping each global line number back to a
 * session and a message index via the offsets table. Pure — unit-testable without ripgrep.
 */
export function parseRgOutput(
  output: string,
  offsets: Record<string, OffsetEntry>,
  query: string,
  limit: number,
): IndexedMessageHit[] {
  const lowerQuery = query.toLowerCase();
  const sorted = Object.entries(offsets).sort((a, b) => a[1].startLine - b[1].startLine);
  const results: IndexedMessageHit[] = [];

  for (const line of output.split("\n")) {
    if (results.length >= limit) break;
    if (!line) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const lineNo = Number(line.slice(0, colon));
    if (!Number.isInteger(lineNo)) continue;

    const loc = findOffsetEntry(sorted, lineNo);
    if (!loc) continue;

    const msgIndex = lineNo - loc.entry.startLine;
    // Strip the `<msgIndex>\t` prefix to get the flat message text for the snippet.
    const tabIdx = line.indexOf("\t", colon + 1);
    const text = tabIdx === -1 ? line.slice(colon + 1) : line.slice(tabIdx + 1);
    const snippet = buildSnippet(text, lowerQuery, query.length);
    results.push({ sessionKey: loc.key, msgIndex, snippet });
  }

  return results;
}

function findOffsetEntry(
  sorted: Array<[string, OffsetEntry]>,
  lineNo: number,
): { key: string; entry: OffsetEntry } | null {
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [key, entry] = sorted[mid];
    if (lineNo < entry.startLine) hi = mid - 1;
    else if (lineNo >= entry.startLine + entry.msgCount) lo = mid + 1;
    else return { key, entry };
  }
  return null;
}
