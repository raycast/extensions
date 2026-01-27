import { createHash, randomUUID } from "node:crypto";
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
const MAX_ITEMS_PER_FOLDER = 200;

let initPromise: Promise<void> | null = null;
const fileLocks = new Map<string, Promise<void>>();

const hashPath = (p: string): string => createHash("md5").update(p).digest("hex");

const withLock = async <T>(key: string, operation: () => Promise<T>): Promise<T> => {
  const previousLock = fileLocks.get(key) || Promise.resolve();
  const currentLock = (async () => {
    await previousLock.catch(() => {});
    return operation();
  })();
  fileLocks.set(
    key,
    currentLock.then(() => {}),
  );
  try {
    return await currentLock;
  } finally {
    if (fileLocks.get(key) === currentLock.then(() => {})) {
      fileLocks.delete(key);
    }
  }
};

const writeJsonAtomic = async (filePath: string, data: unknown): Promise<void> => {
  const tempFile = `${filePath}.${randomUUID()}.tmp`;
  const dir = path.dirname(filePath);

  try {
    await fs.writeFile(tempFile, JSON.stringify(data));
  } catch (err: unknown) {
    if ((err as { code: string }).code === "ENOENT") {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(tempFile, JSON.stringify(data));
    } else {
      throw err;
    }
  }

  try {
    await fs.rename(tempFile, filePath);
  } catch (err) {
    if ((err as { code: string }).code === "ENOENT") {
      await fs.mkdir(dir, { recursive: true });
      await fs.rename(tempFile, filePath);
    } else {
      await fs.rm(tempFile, { force: true }).catch(() => {});
      throw err;
    }
  }
};

const readJsonSafe = async <T>(filePath: string, fallback: T): Promise<T> => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
};

const getSnapshotPath = (dirPath: string) => path.join(CACHE_DIR, `${hashPath(dirPath)}.json`);

export const initStorage = (): Promise<void> => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const metadataRaw = await fs.readFile(METADATA_FILE, "utf-8");
      const metadata = JSON.parse(metadataRaw);

      if (metadata.version !== CACHE_VERSION) {
        throw new Error("Version mismatch");
      }

      if (!existsSync(CACHE_DIR)) {
        await fs.mkdir(CACHE_DIR, { recursive: true });
      }
    } catch {
      await fs.rm(CACHE_DIR, { recursive: true, force: true }).catch(() => {});
      await fs.rm(GLOBAL_SEARCH_FILE, { force: true }).catch(() => {});

      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(METADATA_FILE, JSON.stringify({ version: CACHE_VERSION }));
    }
  })();

  return initPromise;
};

export const clearCache = async (): Promise<void> => {
  initPromise = null;
  try {
    await fs.rm(CACHE_DIR, { recursive: true, force: true });
    await fs.rm(GLOBAL_SEARCH_FILE, { force: true });
  } catch (e) {
    console.error("Failed to clear cache", e);
  }
};

export const hasIndex = async (): Promise<boolean> => {
  await initStorage();
  return existsSync(GLOBAL_SEARCH_FILE);
};

export const getDirectorySnapshot = async (dirPath: string): Promise<DirectorySnapshot | null> => {
  const file = getSnapshotPath(dirPath);
  try {
    const content = await fs.readFile(file, "utf-8");
    return JSON.parse(content) as DirectorySnapshot;
  } catch {
    return null;
  }
};

export const hasStoredSnapshot = (dirPath: string): boolean => {
  return existsSync(getSnapshotPath(dirPath));
};

export const upsertDirectorySnapshot = async (dirPath: string, newData: DirectorySnapshot): Promise<void> => {
  const file = getSnapshotPath(dirPath);

  await withLock(file, async () => {
    const existing = await readJsonSafe<DirectorySnapshot>(file, { accessible: [], restricted: [] });

    const accessibleMap = new Map<string, FileNode>();
    existing.accessible.forEach((item) => accessibleMap.set(item.path, item));
    newData.accessible.forEach((item) => accessibleMap.set(item.path, item));

    const restrictedMap = new Map<string, FileNode>();
    existing.restricted.forEach((item) => restrictedMap.set(item.path, item));
    newData.restricted.forEach((item) => restrictedMap.set(item.path, item));

    const finalSnapshot: DirectorySnapshot = {
      accessible: Array.from(accessibleMap.values())
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, MAX_ITEMS_PER_FOLDER),
      restricted: Array.from(restrictedMap.values()).slice(0, MAX_ITEMS_PER_FOLDER),
    };

    await writeJsonAtomic(file, finalSnapshot);
  });
};

export const saveGlobalSearchIndex = async (items: FileNode[]): Promise<void> => {
  await withLock(GLOBAL_SEARCH_FILE, async () => {
    await writeJsonAtomic(GLOBAL_SEARCH_FILE, items);
  });
};

export const getGlobalSearchIndex = async (): Promise<FileNode[]> => {
  return readJsonSafe<FileNode[]>(GLOBAL_SEARCH_FILE, []);
};

export const removeItemFromCache = async (filePath: string): Promise<number> => {
  const dir = path.dirname(filePath);
  const file = getSnapshotPath(dir);

  return withLock(file, async () => {
    const snapshot = await readJsonSafe<DirectorySnapshot | null>(file, null);
    if (!snapshot) return 0;

    const item = snapshot.accessible.find((n) => n.path === filePath);
    // Если файла нет в accessible, проверим, не restricted ли он, но restricted не имеют размера обычно
    const bytesRemoved = item ? item.bytes : 0;

    if (!item && !snapshot.restricted.some((n) => n.path === filePath)) {
      return 0;
    }

    const newSnapshot: DirectorySnapshot = {
      accessible: snapshot.accessible.filter((n) => n.path !== filePath),
      restricted: snapshot.restricted.filter((n) => n.path !== filePath),
    };

    await writeJsonAtomic(file, newSnapshot);
    return bytesRemoved;
  });
};

export const decreaseEntrySize = async (
  parentDir: string,
  entryPathToUpdate: string,
  bytesToRemove: number,
): Promise<void> => {
  const file = getSnapshotPath(parentDir);

  await withLock(file, async () => {
    const snapshot = await readJsonSafe<DirectorySnapshot | null>(file, null);
    if (!snapshot) return;

    let changed = false;

    const updateNode = (node: FileNode) => {
      if (node.path === entryPathToUpdate) {
        const oldBytes = node.bytes;
        node.bytes = Math.max(0, node.bytes - bytesToRemove);

        if (oldBytes !== node.bytes) {
          node.formattedSize = formatSize(node.bytes);
          changed = true;
        }
      }
      return node;
    };

    snapshot.accessible = snapshot.accessible.map(updateNode);
    snapshot.restricted = snapshot.restricted.map(updateNode);

    if (changed) {
      snapshot.accessible.sort((a, b) => b.bytes - a.bytes);
      await writeJsonAtomic(file, snapshot);
    }
  });
};
