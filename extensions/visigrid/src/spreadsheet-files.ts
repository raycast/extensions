import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";

export type SheetFile = {
  path: string;
  name: string;
  modified: Date;
};

const EXTENSIONS = ["sheet", "xlsx", "xls", "ods", "csv", "tsv"];

const NAME_QUERY = EXTENSIONS.map((e) => `kMDItemFSName == '*.${e}'c`).join(
  " || ",
);

/** Mid-ladder Spotlight window: files touched in the last 90 days. */
const RECENT_SECONDS = 90 * 24 * 3600;

/** Don't shrink an overflowing window below this — at that point a hard cap
 *  on paths is cheaper than more mdfind round-trips. */
const MIN_WINDOW_SECONDS = 60;

/** fs.stat concurrency bound — cheap syscalls, but don't open the floodgates
 *  on a pathological home directory. */
const STAT_BATCH = 256;

/** Max paths passed to statAll. Date windows that overflow this are
 *  narrowed so the newest `limit` files stay in the candidate set. */
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
      paths
        .slice(i, i + STAT_BATCH)
        .map(async (p): Promise<SheetFile | null> => {
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
const WINDOWS_SECONDS = [
  7 * 24 * 3600,
  RECENT_SECONDS,
  365 * 24 * 3600,
  3 * 365 * 24 * 3600,
];

/** Bound on the final, unwindowed fallback. Reached only when fewer than
 *  `limit` spreadsheets were modified in the last 3 years — at that point
 *  exact ordering among ancient files stops mattering, so bounded work
 *  wins over statting an arbitrarily large collection. */
const FALLBACK_CAP = 2000;

/** Shrink `seconds` until mdfind returns at most STAT_CAP paths, without
 *  dropping below `limit`. A tighter window still contains the newest
 *  files, so ranking stays exact. */
async function narrowWindow(
  paths: string[],
  seconds: number,
  limit: number,
): Promise<string[]> {
  while (paths.length > STAT_CAP && seconds > MIN_WINDOW_SECONDS) {
    const narrowerSeconds = Math.max(
      MIN_WINDOW_SECONDS,
      Math.floor(seconds / 2),
    );
    if (narrowerSeconds >= seconds) break;
    const narrower = await mdfindPaths(dateQuery(narrowerSeconds));
    if (narrower.length < limit) break;
    paths = narrower;
    seconds = narrowerSeconds;
  }
  return paths.length > STAT_CAP ? paths.slice(0, STAT_CAP) : paths;
}

/** Recently-modified spreadsheet files via Spotlight (mdfind), newest first.
 *
 *  mdfind's output is unordered, so recency must come from stat times — and
 *  truncating before stat would drop arbitrary (possibly newest) files.
 *  Spotlight itself narrows to a date window instead, widening until the
 *  list can be filled; a window that still overflows STAT_CAP is tightened
 *  so statAll never walks an unbounded result. Ordering is exact for
 *  anything modified within the window actually ranked. */
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
      paths = (await mdfindPaths(NAME_QUERY)).slice(0, FALLBACK_CAP);
    } else if (paths.length > STAT_CAP) {
      paths = await narrowWindow(paths, seconds, limit);
    }
    const files = await statAll(paths);
    return files
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, limit);
  })();
}
