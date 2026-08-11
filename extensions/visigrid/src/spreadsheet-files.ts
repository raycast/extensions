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

/** Spotlight window for the fast path: files touched in the last 90 days. */
const RECENT_SECONDS = 90 * 24 * 3600;

/** fs.stat concurrency bound — cheap syscalls, but don't open the floodgates
 *  on a pathological home directory. */
const STAT_BATCH = 256;

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

/** Widening Spotlight windows: 90 days, 1 year, 3 years. */
const WINDOWS_SECONDS = [RECENT_SECONDS, 365 * 24 * 3600, 3 * 365 * 24 * 3600];

/** Bound on the final, unwindowed fallback. Reached only when fewer than
 *  `limit` spreadsheets were modified in the last 3 years — at that point
 *  exact ordering among ancient files stops mattering, so bounded work
 *  wins over statting an arbitrarily large collection. */
const FALLBACK_CAP = 2000;

/** Recently-modified spreadsheet files via Spotlight (mdfind), newest first.
 *
 *  mdfind's output is unordered, so recency must come from stat times — and
 *  truncating before stat would drop arbitrary (possibly newest) files.
 *  Spotlight itself narrows to a date window instead, widening until the
 *  list can be filled; every path returned by a window is ranked, so
 *  ordering is exact for anything modified within the widest window. */
export function findSpreadsheets(limit = 50): Promise<SheetFile[]> {
  return (async () => {
    let paths: string[] = [];
    for (const seconds of WINDOWS_SECONDS) {
      paths = await mdfindPaths(
        `(${NAME_QUERY}) && kMDItemFSContentChangeDate >= $time.now(-${seconds})`,
      );
      if (paths.length >= limit) break;
    }
    if (paths.length < limit) {
      paths = (await mdfindPaths(NAME_QUERY)).slice(0, FALLBACK_CAP);
    }
    const files = await statAll(paths);
    return files
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, limit);
  })();
}
