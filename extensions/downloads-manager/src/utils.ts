import { getPreferenceValues } from "@raycast/api";
import { readdirSync, statSync } from "fs";
import { join } from "path";
import untildify from "untildify";

const preferences = getPreferenceValues();
export const downloadsFolder = untildify(preferences.downloadsFolder ?? "~/Downloads");

export function getDownloads() {
  const files = readdirSync(downloadsFolder);
  return files
    .filter((file) => !file.startsWith("."))
    .map((file) => {
      const path = join(downloadsFolder, file);
      const lastModifiedAt = statSync(path).mtime;
      return { file, path, lastModifiedAt };
    })
    .sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
}

export function getLatestDownload() {
  const downloads = getDownloads();
  if (downloads.length < 1) {
    return undefined;
  }

  return downloads[0];
}
