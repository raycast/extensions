import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Claude Desktop sidebar state. The app keeps one JSON file per session under
 *   ~/Library/Application Support/Claude/claude-code-sessions/<account>/<org>/local_<uuid>.json
 * with `cliSessionId` (the transcript uuid we index), `isStarred: true` for sessions pinned in
 * the sidebar and `isArchived: true` for archived ones. Both change without the transcript
 * changing, so they are read at query time rather than indexed. The directory is large (~600 files of ~150 KB, MCP tool schemas are inlined), so
 * the scan is asynchronous, files are matched as bytes (see `flagsIn`), and a file is re-read only
 * when its mtime or size changed. `claudeDesktopState()` is synchronous and returns the last completed scan;
 * the UI calls `refreshClaudeDesktopState()` and re-queries when the sets changed.
 *
 * Only the session's *current* `cliSessionId` counts as pinned. `priorCliSessionIds` (transcripts
 * the same desktop session used before a /clear) are deliberately not included, so one pinned
 * sidebar entry maps to exactly one search result.
 */

export function claudeDesktopSessionsDir(): string {
  return join(homedir(), "Library", "Application Support", "Claude", "claude-code-sessions");
}

interface FileCache {
  mtime: number;
  size: number;
  /** Current transcript uuid, or null when the file has neither flag set. */
  id: string | null;
  starred: boolean;
  archived: boolean;
}

export interface ClaudeDesktopState {
  /** Transcript uuids pinned (starred) in the sidebar. */
  pinned: Set<string>;
  /** Transcript uuids of archived sidebar sessions. */
  archived: Set<string>;
}

const fileCache = new Map<string, FileCache>();
let lastScan = 0;
let lastResult: ClaudeDesktopState = { pinned: new Set(), archived: new Set() };
let inflight: Promise<boolean> | null = null;
const SCAN_TTL_MS = 5000;

const STARRED = Buffer.from('"isStarred":true');
const ARCHIVED = Buffer.from('"isArchived":true');
const CLI_SESSION_ID = Buffer.from('"cliSessionId":"');
const UUID_LEN = 36;
const UUID_RE = /^[0-9a-f-]{36}$/;

/**
 * Matched on the raw bytes: decoding a ~150 KB file to a string and taking the id with a regex
 * capture gives V8 a sliced string whose parent (the whole file) stays alive for as long as the
 * cached id does. With hundreds of archived sessions that pinned tens of MB and blew Raycast's
 * 100 MB heap while typing. Buffers live off-heap and `toString(range)` copies just the uuid.
 */
async function flagsIn(file: string): Promise<Pick<FileCache, "id" | "starred" | "archived">> {
  let bytes: Buffer;
  try {
    bytes = await readFile(file);
  } catch {
    return { id: null, starred: false, archived: false };
  }
  const starred = bytes.includes(STARRED);
  const archived = bytes.includes(ARCHIVED);
  if (!starred && !archived) return { id: null, starred: false, archived: false };
  const at = bytes.indexOf(CLI_SESSION_ID);
  if (at === -1) return { id: null, starred, archived };
  const start = at + CLI_SESSION_ID.length;
  const id = bytes.toString("utf8", start, start + UUID_LEN);
  return { id: UUID_RE.test(id) && bytes[start + UUID_LEN] === 0x22 ? id : null, starred, archived };
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((id) => b.has(id));
}

async function listSessionFiles(): Promise<string[]> {
  const files: string[] = [];
  const root = claudeDesktopSessionsDir();
  let accounts: string[];
  try {
    accounts = await readdir(root);
  } catch {
    return files; // Claude Desktop not installed
  }
  for (const account of accounts) {
    let orgs: string[] = [];
    try {
      orgs = await readdir(join(root, account));
    } catch {
      continue;
    }
    for (const org of orgs) {
      const dir = join(root, account, org);
      let names: string[] = [];
      try {
        names = await readdir(dir);
      } catch {
        continue;
      }
      for (const name of names) if (name.startsWith("local_") && name.endsWith(".json")) files.push(join(dir, name));
    }
  }
  return files;
}

async function scan(): Promise<boolean> {
  const files = await listSessionFiles();
  const seen = new Set(files);
  const result: ClaudeDesktopState = { pinned: new Set(), archived: new Set() };
  const CONCURRENCY = 32;
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    await Promise.all(
      files.slice(i, i + CONCURRENCY).map(async (file) => {
        let st;
        try {
          st = await stat(file);
        } catch {
          return;
        }
        let entry = fileCache.get(file);
        if (!entry || entry.mtime !== st.mtimeMs || entry.size !== st.size) {
          entry = { mtime: st.mtimeMs, size: st.size, ...(await flagsIn(file)) };
          fileCache.set(file, entry);
        }
        if (!entry.id) return;
        if (entry.starred) result.pinned.add(entry.id);
        if (entry.archived) result.archived.add(entry.id);
      }),
    );
  }
  for (const file of fileCache.keys()) if (!seen.has(file)) fileCache.delete(file);
  const changed = !sameSet(result.pinned, lastResult.pinned) || !sameSet(result.archived, lastResult.archived);
  lastResult = result;
  return changed;
}

/** Pinned and archived transcript uuids from the Claude Desktop sidebar, as of the last completed scan. */
export function claudeDesktopState(): ClaudeDesktopState {
  return lastResult;
}

/** Rescan (at most every few seconds). Resolves to true when the pinned or archived set changed. */
export function refreshClaudeDesktopState(force = false): Promise<boolean> {
  if (inflight) return inflight;
  if (!force && Date.now() - lastScan < SCAN_TTL_MS) return Promise.resolve(false);
  lastScan = Date.now();
  inflight = scan()
    .catch(() => false)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
