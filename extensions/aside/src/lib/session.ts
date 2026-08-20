import { promises as fs } from "fs";
import { join } from "path";
import { getPreferenceValues } from "@raycast/api";
import { ASIDE_USER_DATA_DIR, resolveAsideProfile } from "./constants";

const HEADER_SIZE = 8;
const SET_PINNED_STATE_COMMAND = 12;

/** Read Chromium's session command log and return the current pinned state by tab id. */
export async function getPinnedTabIds(): Promise<Set<string>> {
  const { profile } = getPreferenceValues<Preferences>();
  const sessionsDir = join(ASIDE_USER_DATA_DIR, resolveAsideProfile(profile), "Sessions");

  let sessionFiles: string[];
  try {
    sessionFiles = (await fs.readdir(sessionsDir)).filter((name) => name.startsWith("Session_"));
  } catch {
    return new Set();
  }

  const sortedSessionFiles = (
    await Promise.all(
      sessionFiles.map(async (name) => {
        const path = join(sessionsDir, name);
        try {
          return { path, modifiedAt: (await fs.stat(path)).mtimeMs };
        } catch {
          return undefined;
        }
      }),
    )
  ).filter((file): file is { path: string; modifiedAt: number } => Boolean(file));
  sortedSessionFiles.sort((a, b) => a.modifiedAt - b.modifiedAt);

  const sessionBuffers = await Promise.all(
    sortedSessionFiles.map(async ({ path }) => {
      try {
        return await fs.readFile(path);
      } catch {
        return undefined;
      }
    }),
  );

  const pinnedTabIds = new Set<string>();
  for (const sessionData of sessionBuffers) {
    if (!sessionData || sessionData.length < HEADER_SIZE || sessionData.toString("ascii", 0, 4) !== "SNSS") continue;

    let offset = HEADER_SIZE;
    while (offset + 2 <= sessionData.length) {
      const commandSize = sessionData.readUInt16LE(offset);
      offset += 2;
      if (commandSize < 1 || offset + commandSize > sessionData.length) break;

      if (sessionData[offset] === SET_PINNED_STATE_COMMAND && commandSize >= 6) {
        const tabId = sessionData.readInt32LE(offset + 1).toString();
        if (sessionData[offset + 5] !== 0) {
          pinnedTabIds.add(tabId);
        } else {
          pinnedTabIds.delete(tabId);
        }
      }
      offset += commandSize;
    }
  }

  return pinnedTabIds;
}
