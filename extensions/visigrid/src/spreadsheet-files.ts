import { execFile } from "node:child_process";
import { homedir } from "node:os";

export type SheetFile = {
  path: string;
  name: string;
  modified: Date;
};

const EXTENSIONS = ["sheet", "xlsx", "xls", "ods", "csv", "tsv"];

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
      (error, stdout) => {
        if (error) return reject(error);
        const paths = stdout.split("\n").filter(Boolean);
        Promise.all(
          paths.map(
            (p) =>
              new Promise<SheetFile | null>((res) => {
                execFile("/usr/bin/stat", ["-f", "%m", p], (e, out) => {
                  if (e) return res(null);
                  res({
                    path: p,
                    name: p.split("/").pop() ?? p,
                    modified: new Date(parseInt(out.trim(), 10) * 1000),
                  });
                });
              }),
          ),
        ).then((files) => {
          resolve(
            files
              .filter((f): f is SheetFile => f !== null)
              .sort((a, b) => b.modified.getTime() - a.modified.getTime())
              .slice(0, limit),
          );
        });
      },
    );
  });
}
