import { LocalStorage } from "@raycast/api";
import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { Folder } from "./types";

const STORAGE_KEY = "launchpad-folders";

// iCloud Drive paths
const ICLOUD_BASE = join(homedir(), "Library", "Mobile Documents", "com~apple~CloudDocs");
const BUNDLES_DIR = join(ICLOUD_BASE, "Raycast Bundles");
const BUNDLES_FILE = join(BUNDLES_DIR, "bundles.json");

const useICloud = existsSync(ICLOUD_BASE);

// In-memory cache
let cache: Folder[] | null = null;
let pendingPromise: Promise<Folder[]> | null = null;
let migrationDone = false;

/**
 * Read raw JSON from the active backend (iCloud file or LocalStorage)
 */
async function readFromBackend(): Promise<string | undefined> {
  if (useICloud) {
    if (!existsSync(BUNDLES_FILE)) return undefined;
    try {
      return await readFile(BUNDLES_FILE, "utf-8");
    } catch {
      return undefined;
    }
  }
  return await LocalStorage.getItem<string>(STORAGE_KEY);
}

/**
 * Write raw JSON to the active backend (iCloud file or LocalStorage)
 */
async function writeToBackend(json: string): Promise<void> {
  if (useICloud) {
    if (!existsSync(BUNDLES_DIR)) {
      mkdirSync(BUNDLES_DIR, { recursive: true });
    }
    await writeFile(BUNDLES_FILE, json, "utf-8");
  } else {
    await LocalStorage.setItem(STORAGE_KEY, json);
  }
}

/**
 * One-time migration: copy LocalStorage data to iCloud if applicable
 */
async function migrateLocalStorageToICloud(): Promise<void> {
  if (migrationDone || !useICloud) return;
  migrationDone = true;

  if (existsSync(BUNDLES_FILE)) return;

  const localData = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!localData) return;

  try {
    JSON.parse(localData);
  } catch {
    return;
  }

  await writeToBackend(localData);
}

/**
 * Clean up orphaned nested folder references
 */
function cleanupOrphanedReferences(folders: Folder[]): Folder[] {
  const folderIds = new Set(folders.map((f) => f.id));
  let hasChanges = false;

  const cleaned = folders.map((f) => {
    const cleanedItems = f.items.filter((item) => {
      if (item.type === "folder" && item.folderId && !folderIds.has(item.folderId)) {
        hasChanges = true;
        return false;
      }
      return true;
    });

    return cleanedItems.length !== f.items.length ? { ...f, items: cleanedItems } : f;
  });

  return hasChanges ? cleaned : folders;
}

/**
 * Get all folders with caching
 */
export async function getFolders(): Promise<Folder[]> {
  if (cache !== null) return cache;
  if (pendingPromise) return pendingPromise;

  pendingPromise = (async () => {
    try {
      await migrateLocalStorageToICloud();

      const stored = await readFromBackend();
      let folders = stored ? (JSON.parse(stored) as Folder[]) : [];

      const cleaned = cleanupOrphanedReferences(folders);
      if (cleaned !== folders) {
        await writeToBackend(JSON.stringify(cleaned));
        folders = cleaned;
      }

      cache = folders;
      return cache;
    } catch {
      cache = [];
      return cache;
    } finally {
      pendingPromise = null;
    }
  })();

  return pendingPromise;
}

/**
 * Save folders and update cache
 */
export async function saveFolders(folders: Folder[]): Promise<void> {
  cache = folders;
  await writeToBackend(JSON.stringify(folders));
}

/**
 * Invalidate the cache
 */
export function invalidateFoldersCache(): void {
  cache = null;
  pendingPromise = null;
}

/**
 * Add a new folder
 */
export async function addFolder(folder: Folder): Promise<void> {
  const folders = await getFolders();
  await saveFolders([...folders, folder]);
}

/**
 * Update an existing folder
 */
export async function updateFolder(folderId: string, updates: Partial<Folder>): Promise<void> {
  const folders = await getFolders();
  const index = folders.findIndex((f) => f.id === folderId);
  if (index === -1) throw new Error(`Folder not found: ${folderId}`);

  const updated = [...folders];
  updated[index] = { ...folders[index], ...updates };
  await saveFolders(updated);
}

/**
 * Delete a folder and remove all references to it from other folders
 */
export async function deleteFolder(folderId: string): Promise<void> {
  const folders = await getFolders();
  const folderExists = folders.some((f) => f.id === folderId);
  if (!folderExists) throw new Error(`Folder not found: ${folderId}`);

  const updated = folders
    .filter((f) => f.id !== folderId)
    .map((f) => ({
      ...f,
      items: f.items.filter((item) => !(item.type === "folder" && item.folderId === folderId)),
    }));

  await saveFolders(updated);
}

/**
 * Get folder by ID
 */
export async function getFolderById(folderId: string): Promise<Folder | undefined> {
  const folders = await getFolders();
  return folders.find((f) => f.id === folderId);
}

/**
 * Record folder access for recency sorting
 */
export async function recordFolderAccess(folderId: string): Promise<void> {
  const folders = await getFolders();
  const index = folders.findIndex((f) => f.id === folderId);
  if (index === -1) return;

  const now = Date.now();
  if (folders[index].lastUsed === now) return;

  const updated = [...folders];
  updated[index] = { ...folders[index], lastUsed: now };
  await saveFolders(updated);
}

/**
 * Record item access for recency sorting
 */
export async function recordItemAccess(folderId: string, itemId: string): Promise<void> {
  const folders = await getFolders();
  const folderIndex = folders.findIndex((f) => f.id === folderId);
  if (folderIndex === -1) return;

  const itemIndex = folders[folderIndex].items.findIndex((i) => i.id === itemId);
  if (itemIndex === -1) return;

  const now = Date.now();
  if (folders[folderIndex].items[itemIndex].lastUsed === now) return;

  const updatedItems = [...folders[folderIndex].items];
  updatedItems[itemIndex] = { ...updatedItems[itemIndex], lastUsed: now };

  const updated = [...folders];
  updated[folderIndex] = { ...folders[folderIndex], items: updatedItems };
  await saveFolders(updated);
}
