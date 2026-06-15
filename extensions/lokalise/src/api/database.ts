import { environment } from "@raycast/api";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import Fuse from "fuse.js";
import type { ProcessedTranslationKey } from "./client";

// Database file locations in Raycast's support directory
const DB_DIR = join(environment.supportPath, "lokalise-chunks");
const INDEX_PATH = join(environment.supportPath, "lokalise-index.json");
const METADATA_PATH = join(environment.supportPath, "lokalise-metadata.json");

interface KeyIndex {
  i: number; // keyId
  n: string; // keyName
  p: string[]; // platforms
  c: number; // chunkIndex
  ca?: string; // createdAt (ISO date string)
  ma?: string; // modifiedAt (ISO date string)
  dt?: string; // defaultTranslation
}

interface DatabaseIndex {
  keys: KeyIndex[];
}

interface Metadata {
  lastSyncTime: number | null;
}

let indexCache: DatabaseIndex | null = null;
let metadata: Metadata | null = null;
const chunkCache: Map<number, ProcessedTranslationKey[]> = new Map();

function ensureSupportDir(): void {
  const supportDir = environment.supportPath;
  if (!existsSync(supportDir)) {
    mkdirSync(supportDir, { recursive: true });
  }
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }
}

function loadIndex(): DatabaseIndex {
  if (indexCache) {
    return indexCache;
  }

  ensureSupportDir();

  if (existsSync(INDEX_PATH)) {
    try {
      const data = readFileSync(INDEX_PATH, "utf-8");
      indexCache = JSON.parse(data) as DatabaseIndex;
    } catch (error) {
      console.error("Failed to load index:", error);
      indexCache = { keys: [] };
    }
  } else {
    indexCache = { keys: [] };
  }

  return indexCache;
}

function loadChunk(chunkIndex: number): ProcessedTranslationKey[] {
  ensureSupportDir();

  const chunkPath = join(DB_DIR, `chunk-${String(chunkIndex).padStart(4, "0")}.json`);

  if (existsSync(chunkPath)) {
    try {
      const data = readFileSync(chunkPath, "utf-8");
      const chunk = JSON.parse(data) as ProcessedTranslationKey[];
      return chunk;
    } catch (error) {
      console.error(`Failed to load chunk ${chunkIndex}:`, error);
      return [];
    }
  }

  return [];
}

function loadMetadata(): Metadata {
  if (metadata) {
    return metadata;
  }

  ensureSupportDir();

  if (existsSync(METADATA_PATH)) {
    try {
      const data = readFileSync(METADATA_PATH, "utf-8");
      metadata = JSON.parse(data) as Metadata;
    } catch (error) {
      console.error("Failed to load metadata:", error);
      metadata = { lastSyncTime: null };
    }
  } else {
    metadata = { lastSyncTime: null };
  }

  return metadata;
}

function saveChunk(keys: ProcessedTranslationKey[], chunkIndex: number): void {
  ensureSupportDir();
  const chunkPath = join(DB_DIR, `chunk-${String(chunkIndex).padStart(4, "0")}.json`);
  writeFileSync(chunkPath, JSON.stringify(keys), "utf-8");
}

function saveIndex(index: DatabaseIndex): void {
  ensureSupportDir();
  writeFileSync(INDEX_PATH, JSON.stringify(index), "utf-8");
  indexCache = index;
}

function saveMetadata(data: Metadata): void {
  ensureSupportDir();
  writeFileSync(METADATA_PATH, JSON.stringify(data, null, 2), "utf-8");
  metadata = data;
}

export type SortOption = "name-asc" | "name-desc" | "created-desc" | "created-asc" | "modified-desc" | "modified-asc";

export interface DatabaseFilters {
  platforms?: string[];
  searchQuery?: string;
  searchInTranslations?: boolean;
  limit?: number; // Max results to return (default 200)
  sortBy?: SortOption;
}

export async function getKeyById(keyId: number): Promise<ProcessedTranslationKey | null> {
  const index = loadIndex();
  const keyIndex = index.keys.find((k) => k.i === keyId);

  if (!keyIndex) {
    return null;
  }

  const chunk = loadChunk(keyIndex.c);
  const fullKey = chunk.find((k) => k.keyId === keyId);

  return fullKey || null;
}

export async function getAllKeys(filters: DatabaseFilters = {}): Promise<ProcessedTranslationKey[]> {
  const index = loadIndex();
  let matchingIndices = index.keys;

  if (filters.platforms && filters.platforms.length > 0) {
    matchingIndices = matchingIndices.filter((keyIndex) => {
      return filters.platforms!.some((platform) => keyIndex.p.includes(platform));
    });
  }

  // Filter by search query using Fuse.js on the index
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const fuse = new Fuse(matchingIndices, {
      keys: [
        { name: "n", weight: 2 }, // keyName
        { name: "dt", weight: 1.5 }, // defaultTranslation
      ],
      threshold: 0.3,
      ignoreLocation: true,
      includeScore: true,
      minMatchCharLength: 2,
    });

    const results = fuse.search(filters.searchQuery.trim());
    matchingIndices = results.map((result) => result.item);
  }

  if (filters.sortBy) {
    matchingIndices = matchingIndices.slice().sort((a, b) => {
      switch (filters.sortBy) {
        case "name-asc":
          return a.n.localeCompare(b.n);
        case "name-desc":
          return b.n.localeCompare(a.n);
        case "created-desc":
          if (!a.ca || !b.ca) return 0;
          return new Date(b.ca).getTime() - new Date(a.ca).getTime();
        case "created-asc":
          if (!a.ca || !b.ca) return 0;
          return new Date(a.ca).getTime() - new Date(b.ca).getTime();
        case "modified-desc":
          if (!a.ma || !b.ma) return 0;
          return new Date(b.ma).getTime() - new Date(a.ma).getTime();
        case "modified-asc":
          if (!a.ma || !b.ma) return 0;
          return new Date(a.ma).getTime() - new Date(b.ma).getTime();
        default:
          return 0;
      }
    });
  }

  const limit = filters.limit || 200;
  matchingIndices = matchingIndices.slice(0, limit);

  // Group by chunk to minimize chunk loads
  const chunkGroups = new Map<number, KeyIndex[]>();
  for (const keyIndex of matchingIndices) {
    if (!chunkGroups.has(keyIndex.c)) {
      chunkGroups.set(keyIndex.c, []);
    }
    chunkGroups.get(keyIndex.c)!.push(keyIndex);
  }

  const results: ProcessedTranslationKey[] = [];

  // Load chunks one at a time to minimize memory usage
  for (const [chunkIndex, keyIndices] of chunkGroups.entries()) {
    const chunk = loadChunk(chunkIndex);

    for (const keyIndex of keyIndices) {
      const fullKey = chunk.find((k) => k.keyId === keyIndex.i);

      if (fullKey) {
        results.push(fullKey);
      }
    }

    // Chunk is automatically garbage collected after this iteration
  }

  // If searchInTranslations is enabled, apply additional fuzzy search on fields not in the index
  if (filters.searchInTranslations && filters.searchQuery && filters.searchQuery.trim()) {
    const fuse = new Fuse(results, {
      keys: [
        { name: "keyName", weight: 2 },
        { name: "defaultTranslation", weight: 1.5 },
        { name: "description", weight: 1 },
        { name: "context", weight: 1 },
        { name: "tags", weight: 0.5 },
        { name: "translations.text", weight: 1 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
      includeScore: true,
      minMatchCharLength: 2,
    });

    const fuzzyResults = fuse.search(filters.searchQuery.trim());
    return fuzzyResults.map((result) => result.item);
  }

  return results;
}

export async function writeChunk(keys: ProcessedTranslationKey[], chunkIndex: number): Promise<void> {
  saveChunk(keys, chunkIndex);

  // Update index with this chunk's keys (minimal data)
  const index = loadIndex();

  const newIndexEntries: KeyIndex[] = keys.map((key) => ({
    i: key.keyId,
    n: key.keyName,
    p: key.platforms,
    c: chunkIndex,
    ca: key.createdAt,
    ma: key.modifiedAt,
    dt: key.defaultTranslation,
  }));

  index.keys.push(...newIndexEntries);
  saveIndex(index);
}

export async function addSingleKey(key: ProcessedTranslationKey): Promise<void> {
  const index = loadIndex();

  // Find the last chunk or create a new one
  let lastChunkIndex = 0;
  if (index.keys.length > 0) {
    lastChunkIndex = Math.max(...index.keys.map((k) => k.c));
  }

  let lastChunk = loadChunk(lastChunkIndex);

  // If chunk is full, create a new chunk
  if (lastChunk.length >= 100) {
    lastChunkIndex++;
    lastChunk = [];
  }

  lastChunk.push(key);
  saveChunk(lastChunk, lastChunkIndex);

  const newIndexEntry: KeyIndex = {
    i: key.keyId,
    n: key.keyName,
    p: key.platforms,
    c: lastChunkIndex,
    ca: key.createdAt,
    ma: key.modifiedAt,
    dt: key.defaultTranslation,
  };

  index.keys.push(newIndexEntry);
  saveIndex(index);
}

export async function clearDatabase(): Promise<void> {
  ensureSupportDir();

  // Delete all chunk files
  if (existsSync(DB_DIR)) {
    const files = readdirSync(DB_DIR);
    for (const file of files) {
      if (file.endsWith(".json")) {
        unlinkSync(join(DB_DIR, file));
      }
    }
  }

  saveIndex({ keys: [] });

  indexCache = null;
  chunkCache.clear();
}

export async function getLastSyncTime(): Promise<number | null> {
  const meta = loadMetadata();
  return meta.lastSyncTime;
}

/**
 * Set the last sync timestamp
 */
export async function setLastSyncTime(timestamp: number): Promise<void> {
  const meta = loadMetadata();
  meta.lastSyncTime = timestamp;
  saveMetadata(meta);
}

/**
 * Get database statistics (estimate translations/screenshots to avoid loading all chunks)
 */
export async function getDatabaseStats(): Promise<{
  totalKeys: number;
  totalTranslations: number;
  totalScreenshots: number;
  lastSyncTime: number | null;
}> {
  const index = loadIndex();
  const meta = loadMetadata();

  // Estimate translations/screenshots from a sample to avoid loading all chunks
  const uniqueChunks = Array.from(new Set(index.keys.map((k) => k.c)));

  if (uniqueChunks.length === 0) {
    return {
      totalKeys: 0,
      totalTranslations: 0,
      totalScreenshots: 0,
      lastSyncTime: meta.lastSyncTime,
    };
  }

  // Sample first chunk only to estimate
  const sampleChunk = loadChunk(uniqueChunks[0]);
  const avgTranslations = sampleChunk.reduce((sum, key) => sum + key.translations.length, 0) / sampleChunk.length;
  const avgScreenshots = sampleChunk.reduce((sum, key) => sum + key.screenshots.length, 0) / sampleChunk.length;

  // Estimate totals
  const estimatedTotalTranslations = Math.round(index.keys.length * avgTranslations);
  const estimatedTotalScreenshots = Math.round(index.keys.length * avgScreenshots);

  return {
    totalKeys: index.keys.length,
    totalTranslations: estimatedTotalTranslations,
    totalScreenshots: estimatedTotalScreenshots,
    lastSyncTime: meta.lastSyncTime,
  };
}

/**
 * Check if database has any keys
 */
export async function hasKeys(): Promise<boolean> {
  const index = loadIndex();
  return index.keys.length > 0;
}

/**
 * Initialize the database (ensure files exist)
 */
export async function initDatabase(): Promise<void> {
  loadIndex();
  loadMetadata();
}

/**
 * Invalidate the in-memory cache to force reload from disk
 */
export function invalidateCache(): void {
  indexCache = null;
  chunkCache.clear();
  metadata = null;
}
