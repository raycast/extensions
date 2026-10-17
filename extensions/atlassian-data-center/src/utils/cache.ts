import path from "node:path";
import fs from "node:fs/promises";

import { DEBUG_ENABLE, CACHE_DIR, AVATAR_TYPE_CACHE_KEY_MAP } from "@/constants";
import { pathExists, ensureDirExists } from "@/utils";
import type { AvatarType } from "@/types";
import { Cache } from "@raycast/api";

export async function clearAvatarCacheByType(avatarType: AvatarType, cache: Cache) {
  cache.remove(AVATAR_TYPE_CACHE_KEY_MAP[avatarType]);
  await removeDirectories([CACHE_DIR[avatarType]]);
}

export async function removeDirectories(directories: string[]) {
  for (const dir of directories) {
    try {
      const exists = await pathExists(dir);
      if (exists) {
        await fs.rm(dir, { recursive: true, force: true });
        console.log(`🚀 ~ Removed directory: ${dir}`);
      }
    } catch (error) {
      console.error(`🚀 ~ Failed to remove directory ${dir}:`, error);
    }
  }
}

/**
 * Write API or command response data to debug file.
 * Only active when DEBUG_ENABLE is true.
 */
export async function writeResponseFile(content: string, filenameWithoutExt: string) {
  if (!DEBUG_ENABLE) return;

  try {
    await ensureDirExists(CACHE_DIR.API_RESPONSE);

    const filename = `${filenameWithoutExt}.json`;
    const filePath = path.join(CACHE_DIR.API_RESPONSE, filename);

    await fs.writeFile(filePath, content, "utf8");
    // console.log(`🚀 ~ Debug response written to: ${filePath}`);
  } catch (error) {
    console.warn("🚀 ~ Failed to write response file:", error);
  }
}
