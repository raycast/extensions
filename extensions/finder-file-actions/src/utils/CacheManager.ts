import { Cache, LocalStorage } from "@raycast/api";
import { PinnedFolder } from "../types";

const PINNED_FOLDERS_KEY = "pinnedFolders";
const CACHE_EXPIRY_TIME = 3600; // 1 hour in seconds

export class CacheManager {
  async pinFolder(folder: PinnedFolder): Promise<void> {
    const pinnedFolders = await this.getPinnedFolders();

    // Check if folder is already pinned
    if (pinnedFolders.some((f) => f.path === folder.path)) {
      return;
    }

    pinnedFolders.push(folder);
    await LocalStorage.setItem(PINNED_FOLDERS_KEY, JSON.stringify(pinnedFolders));
  }

  async unpinFolder(path: string): Promise<void> {
    const pinnedFolders = await this.getPinnedFolders();
    const updatedFolders = pinnedFolders.filter((f) => f.path !== path);
    await LocalStorage.setItem(PINNED_FOLDERS_KEY, JSON.stringify(updatedFolders));
  }

  async getPinnedFolders(): Promise<PinnedFolder[]> {
    const data = await LocalStorage.getItem(PINNED_FOLDERS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  }

  async cleanupCache(): Promise<void> {
    const pinnedFolders = await this.getPinnedFolders();
    const pinnedPaths = new Set(pinnedFolders.map((f) => f.path));

    const cacheData = await Cache.get("folder_contents");
    if (!cacheData) return;

    const now = Date.now();
    const cacheEntries = Object.entries(cacheData);

    for (const [key, value] of cacheEntries) {
      const path = key.replace("folder_contents_", "");
      const isPinned = pinnedPaths.has(path);
      const isExpired = (now - value.timestamp) / 1000 > CACHE_EXPIRY_TIME;

      if (!isPinned && isExpired) {
        await Cache.remove(key);
      }
    }
  }
}
