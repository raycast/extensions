import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { environment } from "@raycast/api";
import type { DirectorySnapshot, FileNode } from "../types";
import { formatSize } from "./format";

const CACHE_DIR = path.join(environment.supportPath, "fs-cache");
const GLOBAL_SEARCH_FILE = path.join(environment.supportPath, "global-search.json");
const METADATA_FILE = path.join(environment.supportPath, "metadata.json");

const CACHE_VERSION = 1;

const hashPath = (p: string): string => createHash("md5").update(p).digest("hex");
const MAX_ITEMS_PER_FOLDER = 200;

export const initStorage = async (): Promise<void> => {
  try {
    const metadataRaw = await fs.readFile(METADATA_FILE, "utf-8");
    const metadata = JSON.parse(metadataRaw);

    if (metadata.version !== CACHE_VERSION) {
      throw new Error("Version mismatch");
    }
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {
    await fs.rm(CACHE_DIR, { recursive: true, force: true });
    await fs.rm(GLOBAL_SEARCH_FILE, { force: true });
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(METADATA_FILE, JSON.stringify({ version: CACHE_VERSION }));
  }
};

export const clearCache = async (): Promise<void> => {
  try {
    await fs.rm(CACHE_DIR, { recursive: true, force: true });
    await fs.rm(GLOBAL_SEARCH_FILE, { force: true });
    await initStorage();
  } catch (e) {
    console.error("Failed to clear cache", e);
  }
};

export const hasIndex = async (): Promise<boolean> => {
  try {
    await initStorage();
    await fs.access(GLOBAL_SEARCH_FILE);
    return true;
  } catch {
    return false;
  }
};

export const getDirectorySnapshot = async (dirPath: string): Promise<DirectorySnapshot | null> => {
  try {
    const file = path.join(CACHE_DIR, `${hashPath(dirPath)}.json`);
    const content = await fs.readFile(file, "utf-8");
    return JSON.parse(content) as DirectorySnapshot;
  } catch {
    return null;
  }
};

export const hasStoredSnapshot = (dirPath: string): boolean => {
  const file = path.join(CACHE_DIR, `${hashPath(dirPath)}.json`);
  return existsSync(file);
};

export const upsertDirectorySnapshot = async (dirPath: string, newData: DirectorySnapshot): Promise<void> => {
  const file = path.join(CACHE_DIR, `${hashPath(dirPath)}.json`);
  let existing: DirectorySnapshot = { accessible: [], restricted: [] };

  try {
    const content = await fs.readFile(file, "utf-8");
    existing = JSON.parse(content) as DirectorySnapshot;
  } catch {
    // ignore
  }

  const accessibleMap = new Map<string, FileNode>();
  existing.accessible.forEach((item) => accessibleMap.set(item.path, item));
  newData.accessible.forEach((item) => accessibleMap.set(item.path, item));

  const restrictedMap = new Map<string, FileNode>();
  existing.restricted.forEach((item) => restrictedMap.set(item.path, item));
  newData.restricted.forEach((item) => restrictedMap.set(item.path, item));

  const mergedAccessible = Array.from(accessibleMap.values()).sort((a, b) => b.bytes - a.bytes);
  const mergedRestricted = Array.from(restrictedMap.values());

  const finalSnapshot: DirectorySnapshot = {
    accessible: mergedAccessible.slice(0, MAX_ITEMS_PER_FOLDER),
    restricted: mergedRestricted.slice(0, MAX_ITEMS_PER_FOLDER),
  };

  await fs.writeFile(file, JSON.stringify(finalSnapshot));
};

export const saveGlobalSearchIndex = async (items: FileNode[]): Promise<void> => {
  await fs.writeFile(GLOBAL_SEARCH_FILE, JSON.stringify(items));
};

export const getGlobalSearchIndex = async (): Promise<FileNode[]> => {
  try {
    const content = await fs.readFile(GLOBAL_SEARCH_FILE, "utf-8");
    return JSON.parse(content) as FileNode[];
  } catch {
    return [];
  }
};

export const removeItemFromCache = async (filePath: string): Promise<number> => {
  const dir = path.dirname(filePath);
  const snapshot = await getDirectorySnapshot(dir);
  if (!snapshot) return 0;

  const item = snapshot.accessible.find((n) => n.path === filePath);
  const bytesRemoved = item ? item.bytes : 0;

  const newSnapshot: DirectorySnapshot = {
    accessible: snapshot.accessible.filter((n) => n.path !== filePath),
    restricted: snapshot.restricted.filter((n) => n.path !== filePath),
  };

  const file = path.join(CACHE_DIR, `${hashPath(dir)}.json`);
  await fs.writeFile(file, JSON.stringify(newSnapshot));

  return bytesRemoved;
};

export const decreaseEntrySize = async (
  parentDir: string,
  entryPathToUpdate: string,
  bytesToRemove: number,
): Promise<void> => {
  const snapshot = await getDirectorySnapshot(parentDir);
  if (!snapshot) return;

  let changed = false;

  const updateNode = (node: FileNode) => {
    if (node.path === entryPathToUpdate) {
      node.bytes = Math.max(0, node.bytes - bytesToRemove);
      node.formattedSize = formatSize(node.bytes);
      changed = true;
    }
    return node;
  };

  snapshot.accessible = snapshot.accessible.map(updateNode).sort((a, b) => b.bytes - a.bytes);
  snapshot.restricted = snapshot.restricted.map(updateNode);

  if (changed) {
    const file = path.join(CACHE_DIR, `${hashPath(parentDir)}.json`);
    await fs.writeFile(file, JSON.stringify(snapshot));
  }
};
