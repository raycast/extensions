import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";

export type SheetFile = {
  path: string;
  name: string;
  modified: Date;
};

const EXTENSIONS = ["sheet", "xlsx", "xls", "ods", "csv", "tsv"];

/** Spotlight can return thousands of paths in a big home directory; stat at
 *  most this many (no subprocesses — plain fs.stat) before ranking. */
const STAT_CAP = 400;

/** Recently-modified spreadsheet files via Spotlight (mdfind), newest first.
 *  Spotlight already indexes the user's files; no walking, no configuration. */
export function findSpreadsheets(limit = 50): Promise<SheetFile[]> {
  const query = EXTENSIONS.map((e) => `kMDItemFSName == '*.${e}'c`).join(
    " || ",
  );
  return new Promise((resolve, reject) => {
    execFile(
      "/usr/bin/mdfind",
      ["-onlyin", homedir(), query],
      { maxBuffer: 8 * 1024 * 1024, timeout: 10000 },
      async (error, stdout) => {
        if (error) return reject(error);
        const paths = stdout.split("\n").filter(Boolean).slice(0, STAT_CAP);
        const files = await Promise.all(
          paths.map(async (p): Promise<SheetFile | null> => {
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
        resolve(
          files
            .filter((f): f is SheetFile => f !== null)
            .sort((a, b) => b.modified.getTime() - a.modified.getTime())
            .slice(0, limit),
        );
      },
    );
  });
}
