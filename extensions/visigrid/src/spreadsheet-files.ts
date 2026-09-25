import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";

export type SheetFile = {
  path: string;
  name: string;
  modified: Date;
};

const EXTENSIONS = ["sheet", "xlsx", "xls", "ods", "csv", "tsv"];

const NAME_QUERY = EXTENSIONS.map((e) => `kMDItemFSName == '*.${e}'c`).join(" || ");

/** Mid-ladder Spotlight window: files touched in the last 90 days. */
const RECENT_SECONDS = 90 * 24 * 3600;

/** fs.stat concurrency bound — cheap syscalls, but don't open the floodgates
 *  on a pathological home directory. */
const STAT_BATCH = 256;

/** Max paths passed to statAll. Date windows that overflow this are
 *  narrowed so the newest files stay in the candidate set. */
const STAT_CAP = 512;

function mdfindPaths(query: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    execFile(
      "/usr/bin/mdfind",
      ["-onlyin", homedir(), query],
      { maxBuffer: 16 * 1024 * 1024, timeout: 10000 },
      (error, stdout) => {
        if (error) return reject(error);
        resolve(stdout.split("\n").filter(Boolean));
      },
    );
  });
}

function dateQuery(seconds: number): string {
  return `(${NAME_QUERY}) && kMDItemFSContentChangeDate >= $time.now(-${seconds})`;
}

async function statAll(paths: string[]): Promise<SheetFile[]> {
  const out: SheetFile[] = [];
  for (let i = 0; i < paths.length; i += STAT_BATCH) {
    const batch = await Promise.all(
      paths.slice(i, i + STAT_BATCH).map(async (p): Promise<SheetFile | null> => {
        try {
          const s = await stat(p);
          return {
            path: p,
            name: p.split("/").pop() ?? p,
            modified: s.mtime,
          };
        } catch {
          return null;
        }
      }),
    );
    out.push(...batch.filter((f): f is SheetFile => f !== null));
  }
  return out;
}

/** Widening Spotlight windows: 7 days, 90 days, 1 year, 3 years. */
const WINDOWS_SECONDS = [7 * 24 * 3600, RECENT_SECONDS, 365 * 24 * 3600, 3 * 365 * 24 * 3600];

async function rankByMtime(paths: string[]): Promise<SheetFile[]> {
  const files = await statAll(paths);
  return files.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

/** Shrink an overflowing Spotlight window to a set that still contains the
 *  newest files and is safe to rank. Search down to 1 second for the largest
 *  window with at least `limit` and at most STAT_CAP paths. If no such window
 *  exists, rank the smallest overflowing set by mtime and keep STAT_CAP —
 *  never slice unordered mdfind output, and never hand the caller a list
 *  larger than STAT_CAP. */
async function narrowAndRank(paths: string[], seconds: number, limit: number): Promise<SheetFile[]> {
  const cache = new Map<number, string[]>([[seconds, paths]]);
  const query = async (s: number): Promise<string[]> => {
    const cached = cache.get(s);
    if (cached) return cached;
    const found = await mdfindPaths(dateQuery(s));
    cache.set(s, found);
    return found;
  };

  let low = 1;
  let high = seconds;
  let best: string[] | undefined;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midPaths = await query(mid);
    if (midPaths.length <= STAT_CAP) {
      best = midPaths;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (best && best.length >= limit) return rankByMtime(best);

  const overflow = await query(Math.min(seconds, Math.max(low, 1)));
  return (await rankByMtime(overflow)).slice(0, STAT_CAP);
}

/** Recently-modified spreadsheet files via Spotlight (mdfind), newest first.
 *
 *  mdfind's output is unordered, so recency must come from stat times — and
 *  truncating before stat would drop arbitrary (possibly newest) files.
 *  Spotlight itself narrows to a date window instead, widening until the
 *  list can be filled; a window that still overflows STAT_CAP is tightened
 *  to the largest date range that still fits, so newest files stay in the
 *  candidate set. If even the widest window is short, the unwindowed
 *  fallback ranks every match by mtime before capping — never by slicing
 *  unordered Spotlight output. */
export function findSpreadsheets(limit = 50): Promise<SheetFile[]> {
  return (async () => {
    let paths: string[] = [];
    let seconds = 0;
    for (const window of WINDOWS_SECONDS) {
      seconds = window;
      paths = await mdfindPaths(dateQuery(seconds));
      if (paths.length >= limit) break;
    }
    if (paths.length < limit) {
      paths = await mdfindPaths(NAME_QUERY);
    } else if (paths.length > STAT_CAP) {
      return (await narrowAndRank(paths, seconds, limit)).slice(0, limit);
    }
    return (await rankByMtime(paths)).slice(0, limit);
  })();
}
