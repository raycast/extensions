import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { EGO_LITE_DATA_ROOT, LOCAL_STATE_PATH } from "../constants";

export type ChromiumProfileFile = "AccountBookmarks" | "Bookmarks" | "Favicons" | "History";

export function selectProfileDirectory(state: unknown): string {
  if (!state || typeof state !== "object") return "Default";

  const profile = (state as { profile?: unknown }).profile;
  if (!profile || typeof profile !== "object") return "Default";

  const record = profile as { last_used?: unknown; info_cache?: unknown };
  if (typeof record.last_used === "string" && record.last_used.trim()) {
    return record.last_used;
  }

  if (record.info_cache && typeof record.info_cache === "object") {
    return Object.keys(record.info_cache)[0] ?? "Default";
  }

  return "Default";
}

export function profilePath(profileDirectory: string, fileName: ChromiumProfileFile): string {
  return join(EGO_LITE_DATA_ROOT, profileDirectory, fileName);
}

export async function activeProfilePath(fileName: ChromiumProfileFile): Promise<string> {
  try {
    const state = JSON.parse(await readFile(LOCAL_STATE_PATH, "utf8")) as unknown;
    return profilePath(selectProfileDirectory(state), fileName);
  } catch {
    return profilePath("Default", fileName);
  }
}
