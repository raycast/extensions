import { readdirSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export const downloadsDir = join(homedir(), "Downloads");

export function getDownloads() {
  const files = readdirSync(downloadsDir);
  return files
    .filter((file) => !file.startsWith("."))
    .map((file) => {
      const path = join(downloadsDir, file);
      const lastModifiedAt = statSync(path).mtime;
      return { file, path, lastModifiedAt };
    })
    .sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
}

export async function getLatestDownload() {
  const downloads = getDownloads();
  if (downloads.length < 1) {
    return undefined;
  }

  return downloads[0];
}
