import { Cache } from "@raycast/api";
import { promises as fs } from "fs";
import * as path from "path";
import { NoteWithUrl } from "../types";
import { getPreferences } from "../utils/preferences";

interface CachedFile {
  path: string;
  size: number;
  mtime: number;
  aliases?: string[];
  urls: Array<{
    property: string;
    value: string;
  }>;
}

interface CacheEntry {
  version: number;
  vaultPath: string;
  lastScanTime: number;
  directoryMtimes: Record<string, number>;
  files: Record<string, CachedFile>;
}

export class CacheManager {
  private cache: Cache;
  private readonly CACHE_VERSION = 1;

  constructor() {
    this.cache = new Cache();
  }

  private getCacheKey(vaultPath: string): string {
    return `vault:${vaultPath}:index`;
  }

  private getCacheTTL(): number {
    const preferences = getPreferences();
    // Default to 5 minutes, allow override via preferences
    return (preferences.cacheTTL || 5) * 60 * 1000;
  }

  async getCachedNotes(vaultPath: string): Promise<NoteWithUrl[] | null> {
    try {
      const cacheKey = this.getCacheKey(vaultPath);
      const cached = this.cache.get(cacheKey);

      if (!cached) {
        return null;
      }

      const metaEntry = JSON.parse(cached) as CacheEntry & {
        chunked?: boolean;
        fileCount?: number;
      };

      // Check cache version
      if (metaEntry.version !== this.CACHE_VERSION) {
        this.clearCache(vaultPath);
        return null;
      }

      let entry: CacheEntry;

      // Handle chunked cache
      if (metaEntry.chunked) {
        const chunkCount = parseInt(
          this.cache.get(`${cacheKey}:chunks`) || "0"
        );
        const files: Record<string, CachedFile> = {};

        for (let i = 0; i < chunkCount; i++) {
          const chunkData = this.cache.get(`${cacheKey}:chunk:${i}`);
          if (chunkData) {
            Object.assign(files, JSON.parse(chunkData));
          }
        }

        entry = {
          version: metaEntry.version,
          vaultPath: metaEntry.vaultPath,
          lastScanTime: metaEntry.lastScanTime,
          directoryMtimes: metaEntry.directoryMtimes,
          files,
        };
      } else {
        entry = metaEntry as CacheEntry;
      }

      // Check TTL
      const ttl = this.getCacheTTL();
      if (Date.now() - entry.lastScanTime > ttl) {
        // Cache expired, need to validate
        const isValid = await this.validateCache(entry);
        if (!isValid) {
          return null;
        }
      }

      // Convert cached files to NoteWithUrl format
      return this.convertCacheToNotes(entry);
    } catch (error) {
      // Cache read error - clear cache and return null
      this.clearCache(vaultPath);
      return null;
    }
  }

  async setCachedNotes(
    vaultPath: string,
    notes: NoteWithUrl[],
    directoryMtimes: Record<string, number>,
    fileStats: Map<string, { size: number; mtime: number }>
  ): Promise<void> {
    const files: Record<string, CachedFile> = {};

    // Group notes by file path
    for (const note of notes) {
      const filePath = path.join(vaultPath, note.path);
      const stats = fileStats.get(filePath);

      if (!stats) continue;

      if (!files[filePath]) {
        files[filePath] = {
          path: note.path,
          size: stats.size,
          mtime: stats.mtime,
          aliases: note.aliases,
          urls: [],
        };
      }

      files[filePath].urls.push({
        property: note.urlSource,
        value: note.url,
      });
    }

    const entry: CacheEntry = {
      version: this.CACHE_VERSION,
      vaultPath,
      lastScanTime: Date.now(),
      directoryMtimes,
      files,
    };

    const cacheKey = this.getCacheKey(vaultPath);

    // Check cache size and split if too large
    const serialized = JSON.stringify(entry);
    const MAX_CACHE_SIZE = 2 * 1024 * 1024; // 2MB chunks

    if (serialized.length > MAX_CACHE_SIZE) {
      // Store metadata separately
      const metaEntry = {
        version: this.CACHE_VERSION,
        vaultPath,
        lastScanTime: entry.lastScanTime,
        directoryMtimes,
        fileCount: Object.keys(files).length,
        chunked: true,
      };

      this.cache.set(cacheKey, JSON.stringify(metaEntry));

      // Store files in chunks
      const fileEntries = Object.entries(files);
      const CHUNK_SIZE = 100; // 100 files per chunk
      let chunkIndex = 0;

      for (let i = 0; i < fileEntries.length; i += CHUNK_SIZE) {
        const chunk = Object.fromEntries(fileEntries.slice(i, i + CHUNK_SIZE));
        this.cache.set(
          `${cacheKey}:chunk:${chunkIndex}`,
          JSON.stringify(chunk)
        );
        chunkIndex++;
      }

      // Store chunk count
      this.cache.set(`${cacheKey}:chunks`, String(chunkIndex));
    } else {
      this.cache.set(cacheKey, serialized);
    }
  }

  async validateCache(entry: CacheEntry): Promise<boolean> {
    try {
      // Check all directory modification times
      for (const [dirPath, cachedMtime] of Object.entries(
        entry.directoryMtimes
      )) {
        const stats = await fs.stat(dirPath);
        if (stats.mtime.getTime() !== cachedMtime) {
          // Directory changed
          return false;
        }
      }

      return true;
    } catch (error) {
      // Directory no longer exists or can't be accessed
      return false;
    }
  }

  async getInvalidatedFiles(
    vaultPath: string,
    currentFiles: Set<string>
  ): Promise<{
    toUpdate: string[];
    toRemove: string[];
    cachedFiles: Map<string, CachedFile>;
  }> {
    const cacheKey = this.getCacheKey(vaultPath);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      // No cache, all files need updating
      return {
        toUpdate: Array.from(currentFiles),
        toRemove: [],
        cachedFiles: new Map(),
      };
    }

    const entry: CacheEntry = JSON.parse(cached);
    const cachedFiles = new Map<string, CachedFile>();
    const toUpdate: string[] = [];
    const toRemove: string[] = [];

    // Check for files to remove (in cache but not in current)
    for (const filePath in entry.files) {
      const fullPath = path.join(vaultPath, entry.files[filePath].path);
      if (!currentFiles.has(fullPath)) {
        toRemove.push(filePath);
      } else {
        cachedFiles.set(fullPath, entry.files[filePath]);
      }
    }

    // Check for files to update (new or modified)
    for (const filePath of currentFiles) {
      const cached = cachedFiles.get(filePath);

      if (!cached) {
        // New file
        toUpdate.push(filePath);
      } else {
        // Check if file was modified
        try {
          const stats = await fs.stat(filePath);
          if (
            stats.size !== cached.size ||
            stats.mtime.getTime() !== cached.mtime
          ) {
            toUpdate.push(filePath);
          }
        } catch {
          // Can't stat file, mark for update
          toUpdate.push(filePath);
        }
      }
    }

    return { toUpdate, toRemove, cachedFiles };
  }

  clearCache(vaultPath: string): void {
    const cacheKey = this.getCacheKey(vaultPath);

    // Check if cache is chunked
    const cached = this.cache.get(cacheKey);
    if (cached) {
      try {
        const metaEntry = JSON.parse(cached) as { chunked?: boolean };
        if (metaEntry.chunked) {
          // Remove all chunks
          const chunkCount = parseInt(
            this.cache.get(`${cacheKey}:chunks`) || "0"
          );
          for (let i = 0; i < chunkCount; i++) {
            this.cache.remove(`${cacheKey}:chunk:${i}`);
          }
          this.cache.remove(`${cacheKey}:chunks`);
        }
      } catch {
        // Ignore parse errors
      }
    }

    this.cache.remove(cacheKey);
  }

  clearAllCaches(): void {
    this.cache.clear();
  }

  private convertCacheToNotes(entry: CacheEntry): NoteWithUrl[] {
    const notes: NoteWithUrl[] = [];

    for (const [filePath, cachedFile] of Object.entries(entry.files)) {
      const baseNote = {
        path: cachedFile.path,
        vault: entry.vaultPath,
        title: path.basename(cachedFile.path, ".md"),
        frontmatter: {}, // Will be populated by scanner if needed
        lastModified: new Date(cachedFile.mtime),
      };

      for (const urlInfo of cachedFile.urls) {
        notes.push({
          ...baseNote,
          id: `${filePath}-${urlInfo.property}`,
          aliases: cachedFile.aliases,
          url: urlInfo.value,
          urlSource: urlInfo.property,
        });
      }
    }

    return notes;
  }
}
