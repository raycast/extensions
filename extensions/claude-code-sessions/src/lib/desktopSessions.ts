import { createReadStream, promises as fs, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { KeyValueCache } from "./sessions";

/**
 * Claude Desktop's own session registry, read-only.
 *
 * Lives at `~/Library/Application Support/Claude/claude-code-sessions/<account>/<device>/local_<uuid>.json`
 * (found by inspecting real files on disk; confirmed flat — no further
 * nesting below the two id-named directories).
 *
 * MEMORY: measured on a real profile — each file is dominated by an
 * `enabledMcpTools` blob that is ~99.9% of the file's bytes (one
 * 518,610-byte file had `sessionId`/`cliSessionId`/`cwd`/`title` all in its
 * first 448 bytes; the remaining 518,162 bytes were `enabledMcpTools`).
 * Across 115 files on disk that's ~34.5MB of raw JSON. An earlier version of
 * this file read each file fully (`fs.readFile` + full `JSON.parse`) and did
 * all 115 in one `Promise.all` — that blew the Raycast extension worker's
 * heap (parsed string-keyed objects carry substantially more V8 overhead
 * than their raw byte size, and the concurrent full parses spiked well past
 * the worker's memory limit). We never need `enabledMcpTools`, so we never
 * read it: each file is opened twice — a small head read for the fields
 * that live before the blob, and a small tail read for `bridgeSessionId(s)`,
 * which (checked across 10 real files) consistently lands in the last
 * ~0.1-0.2% of the file, *after* `enabledMcpTools` — and both are parsed
 * with plain regex, never `JSON.parse` of the file content.
 *
 * The fields we read out: `sessionId` ("local_<uuid>"), `cliSessionId` (the
 * same uuid as our own `.jsonl` session filenames under `~/.claude/projects`
 * — the join key back to SessionMeta.sessionId), `cwd`, `title`,
 * `isArchived` (found at byte 604 of a 516,108-byte sample file — well
 * inside the head prefix, right next to `title`),
 * `bridgeSessionId`/`bridgeSessionIds` (Claude's cross-device "bridge" ids,
 * prefixed `cse_` or `session_` — interchangeable, Claude Desktop normalizes
 * between them; confirmed via static analysis of app.asar, see
 * desktopDeepLink.ts, that a session with a bridge id can be opened directly
 * with `claude://code/<bridgeId>` instead of `claude://resume` re-importing
 * it), and `scheduledTaskId` (e.g. `"day-planner"` — present on the ~50
 * daily-scheduled-task sessions a real profile accumulates, which Claude
 * Desktop's own sidebar hides from its "active" list; found sitting right
 * next to `bridgeSessionIds` at ~99.96% into a 359,103-byte sample file, so
 * it's covered by the same tail read).
 */
const DESKTOP_SESSIONS_ROOT = join(
  homedir(),
  "Library",
  "Application Support",
  "Claude",
  "claude-code-sessions",
);

/** Only need to read this many bytes per file — see the module doc for why. */
const PREFIX_READ_BYTES = 8192;
const SUFFIX_READ_BYTES = 8192;

export interface DesktopSessionInfo {
  /** The desktop's own session id, e.g. "local_<uuid>". */
  localSessionId: string;
  /** The CLI transcript uuid this desktop session was created/resumed from. */
  cliSessionId: string;
  /** Desktop-side title, if Claude Desktop has generated or been given one. */
  title?: string;
  cwd?: string;
  /** First available cross-device bridge id (`cse_...` or `session_...`), if any. */
  bridgeId?: string;
  isArchived?: boolean;
  /** e.g. "day-planner" — set when this session was created by a scheduled task, not a human. */
  scheduledTaskId?: string;
}

/** Recursively collects `local_*.json` files under `dir`, bounded to a small depth. */
async function findLocalSessionFiles(
  dir: string,
  maxDepth: number,
): Promise<string[]> {
  if (maxDepth < 0) return [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await findLocalSessionFiles(entryPath, maxDepth - 1)));
      } else if (entry.isFile() && /^local_.*\.json$/.test(entry.name)) {
        files.push(entryPath);
      }
    }),
  );
  return files;
}

/** Reads only the first `maxBytes` bytes of a file — never the whole thing. */
async function readPrefix(filePath: string, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, {
      encoding: "utf8",
      start: 0,
      end: maxBytes - 1,
    });
    let data = "";
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      stream.destroy();
      resolve(data);
    };
    stream.on("data", (chunk) => {
      data += chunk;
      if (data.length >= maxBytes) finish();
    });
    stream.on("end", finish);
    stream.on("error", (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
  });
}

/** Reads only the last `maxBytes` bytes of a file — never the whole thing. */
async function readSuffix(filePath: string, maxBytes: number): Promise<string> {
  let size: number;
  try {
    size = (await fs.stat(filePath)).size;
  } catch {
    return "";
  }
  const start = Math.max(0, size - maxBytes);
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, {
      encoding: "utf8",
      start,
      end: size - 1,
    });
    let data = "";
    stream.on("data", (chunk) => {
      data += chunk;
    });
    stream.on("end", () => resolve(data));
    stream.on("error", reject);
  });
}

function extractStringField(prefix: string, field: string): string | undefined {
  const match = new RegExp(`"${field}":"((?:[^"\\\\]|\\\\.)*)"`).exec(prefix);
  if (!match) return undefined;
  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return match[1];
  }
}

function extractFirstArrayString(
  prefix: string,
  field: string,
): string | undefined {
  const match = new RegExp(`"${field}":\\[\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(
    prefix,
  );
  if (!match) return undefined;
  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return match[1];
  }
}

function extractBooleanField(
  prefix: string,
  field: string,
): boolean | undefined {
  const match = new RegExp(`"${field}":(true|false)`).exec(prefix);
  return match ? match[1] === "true" : undefined;
}

/** Parses one desktop session file's small head+tail — never its full content. */
async function readDesktopSessionInfo(
  filePath: string,
): Promise<DesktopSessionInfo | undefined> {
  const [prefix, suffix] = await Promise.all([
    readPrefix(filePath, PREFIX_READ_BYTES),
    readSuffix(filePath, SUFFIX_READ_BYTES),
  ]);
  const localSessionId = extractStringField(prefix, "sessionId");
  const cliSessionId = extractStringField(prefix, "cliSessionId");
  if (!localSessionId || !cliSessionId) return undefined;

  // bridgeSessionId(s) and scheduledTaskId both land after the huge
  // enabledMcpTools blob in every sample checked, so look in the tail; fall
  // back to the head in case a future format ever puts them earlier.
  const bridgeId =
    extractStringField(suffix, "bridgeSessionId") ??
    extractFirstArrayString(suffix, "bridgeSessionIds") ??
    extractStringField(prefix, "bridgeSessionId") ??
    extractFirstArrayString(prefix, "bridgeSessionIds");
  const scheduledTaskId =
    extractStringField(suffix, "scheduledTaskId") ??
    extractStringField(prefix, "scheduledTaskId");

  return {
    localSessionId,
    cliSessionId,
    title: extractStringField(prefix, "title"),
    cwd: extractStringField(prefix, "cwd"),
    bridgeId,
    isArchived: extractBooleanField(prefix, "isArchived"),
    scheduledTaskId,
  };
}

/**
 * Reads every desktop session record (one per `local_*.json` file), with no
 * merging/deduping — used both to build `loadDesktopSessionIndex`'s
 * cliSessionId-keyed index and, in the smoke script, to look up a specific
 * `local_<uuid>` id directly regardless of whether it "won" that merge.
 * Read-only; never writes to the desktop's session store. Each file's
 * extracted (tiny) record is cached by `path:mtime` in the supplied cache,
 * mirroring how `scanAllSessions` caches CLI session metadata — a file is
 * only re-read when its mtime changes.
 */
export async function loadAllDesktopSessionRecords(
  cache: KeyValueCache,
): Promise<DesktopSessionInfo[]> {
  if (!existsSync(DESKTOP_SESSIONS_ROOT)) return [];

  const files = await findLocalSessionFiles(DESKTOP_SESSIONS_ROOT, 4);
  const records: DesktopSessionInfo[] = [];
  await Promise.all(
    files.map(async (filePath) => {
      let mtimeMs: number;
      try {
        mtimeMs = (await fs.stat(filePath)).mtimeMs;
      } catch {
        return;
      }

      const cacheKey = `desktop:${filePath}:${mtimeMs}`;
      let info: DesktopSessionInfo | undefined;
      const cached = cache.get(cacheKey);
      if (cached) {
        try {
          info = JSON.parse(cached) as DesktopSessionInfo;
        } catch {
          info = undefined;
        }
      }

      if (!info) {
        try {
          info = await readDesktopSessionInfo(filePath);
        } catch {
          return;
        }
        if (!info) return;
        cache.set(cacheKey, JSON.stringify(info));
      }

      records.push(info);
    }),
  );
  return records;
}

/**
 * Builds an index of Claude Desktop sessions keyed by `cliSessionId`, so we
 * can tell whether a CLI session has already been imported/resumed into
 * Claude Desktop before, and whether it has a bridge id we can deep-link to
 * directly.
 */
export async function loadDesktopSessionIndex(
  cache: KeyValueCache,
): Promise<Record<string, DesktopSessionInfo>> {
  const index: Record<string, DesktopSessionInfo> = {};
  const records = await loadAllDesktopSessionRecords(cache);

  for (const info of records) {
    // Multiple desktop sessions can map to the same CLI session (e.g. it
    // was imported more than once). Prefer one with a bridge id (strictly
    // more useful for opening it directly); as a tiebreaker prefer a
    // non-archived one, so a stray archived duplicate never hides the fact
    // that an active copy exists.
    const existing = index[info.cliSessionId];
    const score = (i: DesktopSessionInfo) =>
      (i.bridgeId ? 2 : 0) + (i.isArchived ? 0 : 1);
    if (!existing || score(info) > score(existing)) {
      index[info.cliSessionId] = info;
    }
  }

  return index;
}
