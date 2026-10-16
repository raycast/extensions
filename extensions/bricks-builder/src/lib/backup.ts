import { showInFinder, showToast, Toast } from "@raycast/api";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

interface BackupFile<T> {
  type: string;
  version: 1;
  exportedAt: string;
  items: T[];
}

/** Writes `items` to a new ~/Downloads/<name>-<date>.json (never overwriting one) and shows it in Finder. */
export async function exportItems<T>(type: string, name: string, items: T[]) {
  const date = new Date().toISOString().slice(0, 10);
  const file: BackupFile<T> = { type, version: 1, exportedAt: new Date().toISOString(), items };
  const json = JSON.stringify(file, null, 2);
  let path = "";
  for (let n = 1; ; n++) {
    path = join(homedir(), "Downloads", `${name}-${date}${n > 1 ? `-${n}` : ""}.json`);
    try {
      // Owner-only, since a sites export can hold application passwords; "wx" fails if it exists.
      await writeFile(path, json, { mode: 0o600, flag: "wx" });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  await showInFinder(path);
  await showToast({ style: Toast.Style.Success, title: `Exported ${items.length} to Downloads`, message: path });
}

/** Reads a file written by exportItems, checking it holds the expected kind of items. */
export async function readBackup<T>(path: string, type: string): Promise<T[]> {
  let parsed: Partial<BackupFile<T>>;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new Error("That file isn't valid JSON");
  }
  if (parsed.type !== type || !Array.isArray(parsed.items)) {
    throw new Error(`That file isn't a ${type} export from this extension`);
  }
  return parsed.items;
}
