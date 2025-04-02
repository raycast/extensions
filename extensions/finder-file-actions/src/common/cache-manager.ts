import { LocalStorage } from "@raycast/api";
import { PinnedFolder, SpotlightSearchResult } from "./types";
import { environment } from "@raycast/api";
import fs from "fs-extra";

const PINNED_FOLDERS_KEY = `${environment.extensionName}-pinned-folders`;
const CACHE_VALIDITY_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class CacheManager {
  private static instance: CacheManager;
  private pinnedFolders: Map<string, PinnedFolder> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const storedFolders = await LocalStorage.getItem(PINNED_FOLDERS_KEY);
      if (storedFolders) {
        const folders = JSON.parse(storedFolders as string) as PinnedFolder[];
        // Convert dates back from strings
        folders.forEach((folder) => {
          folder.pinnedAt = new Date(folder.pinnedAt);
          folder.lastVerified = new Date(folder.lastVerified);
          folder.kMDItemLastUsedDate = new Date(folder.kMDItemLastUsedDate);
          folder.kMDItemContentModificationDate = new Date(folder.kMDItemContentModificationDate);
          folder.kMDItemFSCreationDate = new Date(folder.kMDItemFSCreationDate);
          this.pinnedFolders.set(folder.path, folder);
        });
      }
    } catch (error) {
      console.error("Error loading pinned folders:", error);
    }

    this.initialized = true;
  }

  private async save(): Promise<void> {
    try {
      await LocalStorage.setItem(PINNED_FOLDERS_KEY, JSON.stringify(Array.from(this.pinnedFolders.values())));
    } catch (error) {
      console.error("Error saving pinned folders:", error);
    }
  }

  async isPinned(path: string): Promise<boolean> {
    await this.init();
    return this.pinnedFolders.has(path);
  }

  async pinFolder(folder: SpotlightSearchResult): Promise<void> {
    await this.init();

    const pinnedFolder: PinnedFolder = {
      ...folder,
      pinnedAt: new Date(),
      lastVerified: new Date(),
    };

    this.pinnedFolders.set(folder.path, pinnedFolder);
    await this.save();
  }

  async unpinFolder(path: string): Promise<void> {
    await this.init();
    this.pinnedFolders.delete(path);
    await this.save();
  }

  async getPinnedFolders(): Promise<PinnedFolder[]> {
    await this.init();
    await this.verifyPinnedFolders();
    return Array.from(this.pinnedFolders.values()).sort((a, b) => b.pinnedAt.getTime() - a.pinnedAt.getTime());
  }

  private async verifyPinnedFolders(): Promise<void> {
    const now = new Date();
    let needsSave = false;

    for (const [path, folder] of this.pinnedFolders.entries()) {
      // Check if cache is stale
      if (now.getTime() - folder.lastVerified.getTime() > CACHE_VALIDITY_DURATION) {
        try {
          // Verify folder still exists
          if (!(await fs.pathExists(path))) {
            this.pinnedFolders.delete(path);
            needsSave = true;
            continue;
          }

          // Update folder stats
          const stats = await fs.stat(path);
          folder.kMDItemContentModificationDate = stats.mtime;
          folder.kMDItemLastUsedDate = stats.atime;
          folder.lastVerified = now;
          needsSave = true;
        } catch (error) {
          console.error(`Error verifying pinned folder ${path}:`, error);
          // Remove invalid folder
          this.pinnedFolders.delete(path);
          needsSave = true;
        }
      }
    }

    if (needsSave) {
      await this.save();
    }
  }
}
