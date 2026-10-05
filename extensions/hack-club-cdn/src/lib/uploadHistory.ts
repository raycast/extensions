import { LocalStorage, environment } from "@raycast/api";
import { randomUUID } from "crypto";
import { open, unlink, stat, readFile } from "fs/promises";
import { join } from "path";
import type { UploadRecord } from "./types";

const STORAGE_KEY = "uploads";
const MAX_ENTRIES = 200;
const LOCK_PATH = join(environment.supportPath, "uploads.lock");
const LOCK_STALE_MS = 5000;
const LOCK_RETRY_DELAY_MS = 20;
// Total wait budget (LOCK_MAX_ATTEMPTS * LOCK_RETRY_DELAY_MS = 7000ms) must comfortably exceed
// LOCK_STALE_MS (5000ms), so a process contending against a legitimately slow (not crashed)
// holder survives long enough to reach the point where the lock could be reclaimed as stale,
// instead of timing out beforehand.
const LOCK_MAX_ATTEMPTS = 350;

async function acquireLock(): Promise<string> {
  const token = randomUUID();
  for (let attempt = 0; attempt < LOCK_MAX_ATTEMPTS; attempt++) {
    try {
      const handle = await open(LOCK_PATH, "wx");
      await handle.writeFile(token);
      await handle.close();
      return token;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      try {
        const stats = await stat(LOCK_PATH);
        if (Date.now() - stats.mtimeMs > LOCK_STALE_MS) {
          await unlink(LOCK_PATH).catch(() => undefined);
          continue;
        }
      } catch {
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_DELAY_MS));
    }
  }
  throw new Error("Timed out waiting for upload history lock");
}

async function releaseLock(token: string): Promise<void> {
  try {
    const current = await readFile(LOCK_PATH, "utf8");
    if (current === token) {
      await unlink(LOCK_PATH);
    }
  } catch {
    // Lock file already gone, or contents unreadable - nothing safe to do either way.
  }
}

async function withLock<T>(operation: () => Promise<T>): Promise<T> {
  const token = await acquireLock();
  try {
    return await operation();
  } finally {
    await releaseLock(token);
  }
}

export async function getUploads(): Promise<UploadRecord[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as UploadRecord[];
  } catch {
    return [];
  }
}

export async function addUpload(record: UploadRecord): Promise<void> {
  return withLock(async () => {
    const uploads = await getUploads();
    const updated = [record, ...uploads].slice(0, MAX_ENTRIES);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  });
}

export async function removeUpload(id: string): Promise<void> {
  return withLock(async () => {
    const uploads = await getUploads();
    const updated = uploads.filter((upload) => upload.id !== id);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  });
}

export async function updateUpload(id: string, patch: Partial<UploadRecord>): Promise<UploadRecord[]> {
  return withLock(async () => {
    const uploads = await getUploads();
    const updated = uploads.map((upload) => (upload.id === id ? { ...upload, ...patch } : upload));
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  });
}
