import fs from "node:fs/promises";
import { Dirent } from "node:fs";

/** Stop reading after one overflow entry instead of buffering an entire directory. */
export async function readBoundedDirectory(
  dir: string,
  limit: number,
  showHidden: boolean,
) {
  const entries: Dirent[] = [];
  const handle = await fs.opendir(dir);
  for await (const entry of handle) {
    if (!showHidden && entry.name.startsWith(".")) continue;
    if (entries.length >= limit) return { entries, truncated: true };
    entries.push(entry);
  }
  return { entries, truncated: false };
}
