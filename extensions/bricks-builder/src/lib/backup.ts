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

/** Writes `items` to ~/Downloads/<name>-<date>.json and shows it in Finder. */
export async function exportItems<T>(type: string, name: string, items: T[]) {
  const date = new Date().toISOString().slice(0, 10);
  const path = join(homedir(), "Downloads", `${name}-${date}.json`);
  const file: BackupFile<T> = { type, version: 1, exportedAt: new Date().toISOString(), items };
  await writeFile(path, JSON.stringify(file, null, 2));
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
