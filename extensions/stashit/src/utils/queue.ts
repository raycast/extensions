import { LocalStorage } from "@raycast/api";
import { homedir } from "os";
import { existsSync, mkdirSync, writeFile, readFileSync } from "fs";
import { join } from "path";

export interface QueueItem {
  id: string;
  text: string;
  priority: number;
  queue: string;
  createdAt: number;
  poppedAt?: number;
}

const STORAGE_KEY = "stashit-items";
const ARCHIVE_KEY = "stashit-archive";
const SETTINGS_KEY = "stashit-settings";
const DEFAULT_QUEUE = "default";
const DEFAULT_RETENTION_DAYS = 15;

// Debounce sync - wait 2 seconds after last change before writing to file
let syncTimeout: NodeJS.Timeout | null = null;
let syncPending = false;

export interface Settings {
  retentionDays: number;
}

export async function getSettings(): Promise<Settings> {
  const data = await LocalStorage.getItem<string>(SETTINGS_KEY);
  if (!data) return { retentionDays: DEFAULT_RETENTION_DAYS };
  return JSON.parse(data) as Settings;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await LocalStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function getQueue(): Promise<QueueItem[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!data) return [];
  return JSON.parse(data) as QueueItem[];
}

export async function saveQueue(queue: QueueItem[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  scheduleSyncToFile();
}

export async function getArchive(): Promise<QueueItem[]> {
  const data = await LocalStorage.getItem<string>(ARCHIVE_KEY);
  if (!data) return [];

  const archive = JSON.parse(data) as QueueItem[];
  const settings = await getSettings();

  // If retention is 0 or negative, keep forever
  if (settings.retentionDays <= 0) {
    return archive;
  }

  // Auto-cleanup old items
  const cutoffTime = Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000;

  const filtered = archive.filter(
    (item) => (item.poppedAt || item.createdAt) > cutoffTime,
  );

  // If items were removed, save the cleaned archive
  if (filtered.length < archive.length) {
    await LocalStorage.setItem(ARCHIVE_KEY, JSON.stringify(filtered));
    scheduleSyncToFile();
  }

  return filtered;
}

export async function saveArchive(archive: QueueItem[]): Promise<void> {
  await LocalStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  scheduleSyncToFile();
}

// Debounced cleanup - wait 3 seconds after last pop before cleaning
let cleanupTimeout: NodeJS.Timeout | null = null;

function scheduleCleanup(): void {
  if (cleanupTimeout) {
    clearTimeout(cleanupTimeout);
  }

  cleanupTimeout = setTimeout(() => {
    performCleanup();
  }, 3000);
}

// Cleanup old archive items based on retention settings (async, non-blocking)
async function performCleanup(): Promise<void> {
  try {
    const settings = await getSettings();

    // If retention is 0 or negative, keep forever
    if (settings.retentionDays <= 0) {
      return;
    }

    const data = await LocalStorage.getItem<string>(ARCHIVE_KEY);
    if (!data) return;

    const archive = JSON.parse(data) as QueueItem[];
    const cutoffTime =
      Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000;

    const filtered = archive.filter(
      (item) => (item.poppedAt || item.createdAt) > cutoffTime,
    );

    if (filtered.length < archive.length) {
      await LocalStorage.setItem(ARCHIVE_KEY, JSON.stringify(filtered));
      scheduleSyncToFile();
    }
  } catch (error) {
    console.error("Failed to cleanup archive:", error);
  }
}

export function parseItemWithPriority(input: string): {
  text: string;
  priority: number;
  queue: string;
} {
  let text = input.trim();
  let priority = 0;
  let queue = DEFAULT_QUEUE;

  // Match priority ANYWHERE: -10 (dash followed by number)
  const priorityMatch = text.match(/-(\d+)/);
  if (priorityMatch) {
    priority = parseInt(priorityMatch[1], 10);
    text = text.replace(/-\d+/, "").trim();
  }

  // Match #queue-name pattern (must contain at least one letter, can have numbers, hyphens, underscores)
  const queueMatch = text.match(/#([a-zA-Z0-9_-]*[a-zA-Z][a-zA-Z0-9_-]*)/);
  if (queueMatch) {
    queue = queueMatch[1].toLowerCase();
    text = text.replace(/#[a-zA-Z0-9_-]*[a-zA-Z][a-zA-Z0-9_-]*/, "").trim();
  }

  // Clean up extra spaces
  text = text.replace(/\s+/g, " ").trim();

  return { text, priority, queue };
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export async function addItem(input: string): Promise<QueueItem> {
  const { text, priority, queue: queueName } = parseItemWithPriority(input);
  const queue = await getQueue();

  const newItem: QueueItem = {
    id: generateId(),
    text,
    priority,
    queue: queueName,
    createdAt: Date.now(),
  };

  queue.push(newItem);
  await saveQueue(queue);

  return newItem;
}

export async function popItem(queueName?: string): Promise<QueueItem | null> {
  const queue = await getQueue();

  // Filter by queue if specified
  const targetQueue = queueName || DEFAULT_QUEUE;
  const filteredQueue = queue.filter((item) => item.queue === targetQueue);

  if (filteredQueue.length === 0) {
    return null;
  }

  // Sort by priority (highest first), then by createdAt (oldest first for same priority)
  filteredQueue.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.createdAt - b.createdAt;
  });

  const popped = filteredQueue[0];

  // Remove from main queue
  const index = queue.findIndex((item) => item.id === popped.id);
  queue.splice(index, 1);

  // Archive the popped item
  popped.poppedAt = Date.now();
  const archive = await getArchive();
  archive.unshift(popped);
  await saveArchive(archive);

  await saveQueue(queue);

  // Schedule async cleanup (non-blocking)
  scheduleCleanup();

  return popped;
}

export async function popHighestFromAnyQueue(): Promise<QueueItem | null> {
  const queue = await getQueue();

  if (queue.length === 0) {
    return null;
  }

  // Sort all items by priority (highest first), then by createdAt
  queue.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.createdAt - b.createdAt;
  });

  const popped = queue[0];

  // Remove from queue
  queue.shift();

  // Archive the popped item
  popped.poppedAt = Date.now();
  const archive = await getArchive();
  archive.unshift(popped);
  await saveArchive(archive);

  await saveQueue(queue);

  // Schedule async cleanup (non-blocking)
  scheduleCleanup();

  return popped;
}

export async function getSortedQueue(): Promise<QueueItem[]> {
  const queue = await getQueue();

  // Sort by priority (highest first), then by createdAt (oldest first for same priority)
  return queue.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.createdAt - b.createdAt;
  });
}

export async function getQueueNames(): Promise<string[]> {
  const queue = await getQueue();
  const names = new Set(queue.map((item) => item.queue));
  return Array.from(names).sort();
}

export async function getItemsByQueue(queueName: string): Promise<QueueItem[]> {
  const queue = await getQueue();
  return queue
    .filter((item) => item.queue === queueName)
    .sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt - b.createdAt;
    });
}

export async function removeItem(id: string): Promise<boolean> {
  const queue = await getQueue();
  const index = queue.findIndex((item) => item.id === id);

  if (index === -1) {
    return false;
  }

  queue.splice(index, 1);
  await saveQueue(queue);

  return true;
}

export async function popItemById(id: string): Promise<QueueItem | null> {
  const queue = await getQueue();
  const index = queue.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [popped] = queue.splice(index, 1);

  // Archive the popped item
  popped.poppedAt = Date.now();
  const archive = await getArchive();
  archive.unshift(popped);
  await saveArchive(archive);

  await saveQueue(queue);

  // Schedule async cleanup (non-blocking)
  scheduleCleanup();

  return popped;
}

export async function restoreItem(id: string): Promise<boolean> {
  const archive = await getArchive();
  const index = archive.findIndex((item) => item.id === id);

  if (index === -1) {
    return false;
  }

  const [item] = archive.splice(index, 1);
  delete item.poppedAt;

  const queue = await getQueue();
  queue.push(item);

  await saveQueue(queue);
  await saveArchive(archive);

  return true;
}

export async function clearArchive(): Promise<void> {
  await saveArchive([]);
}

export async function deleteQueueByName(queueName: string): Promise<number> {
  const queue = await getQueue();
  const initialLength = queue.length;
  const filtered = queue.filter((item) => item.queue !== queueName);
  await saveQueue(filtered);
  return initialLength - filtered.length;
}

export async function updateItem(
  id: string,
  updates: { text?: string; priority?: number; queue?: string },
): Promise<QueueItem | null> {
  const queue = await getQueue();
  const index = queue.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const item = queue[index];
  if (updates.text !== undefined) item.text = updates.text;
  if (updates.priority !== undefined) item.priority = updates.priority;
  if (updates.queue !== undefined) item.queue = updates.queue;

  await saveQueue(queue);
  return item;
}

export async function getItemById(id: string): Promise<QueueItem | null> {
  const queue = await getQueue();
  return queue.find((item) => item.id === id) || null;
}

// Move item up (increase priority) or down (decrease priority) within its queue
export async function moveItem(
  id: string,
  direction: "up" | "down",
): Promise<boolean> {
  const queue = await getQueue();
  const item = queue.find((i) => i.id === id);

  if (!item) return false;

  // Get items in the same queue, sorted by priority (highest first), then by createdAt
  const sameQueueItems = queue
    .filter((i) => i.queue === item.queue)
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.createdAt - b.createdAt;
    });

  const currentIndex = sameQueueItems.findIndex((i) => i.id === id);

  if (direction === "up" && currentIndex === 0) return false; // Already at top
  if (direction === "down" && currentIndex === sameQueueItems.length - 1)
    return false; // Already at bottom

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  const targetItem = sameQueueItems[targetIndex];

  // Set priority relative to target item (target's priority +/- 1)
  if (direction === "up") {
    // Moving up = higher priority than the item above
    item.priority = targetItem.priority + 1;
  } else {
    // Moving down = lower priority than the item below (min 0)
    item.priority = Math.max(0, targetItem.priority - 1);
  }

  await saveQueue(queue);
  return true;
}

// File backup functions
const BACKUP_DIR = join(homedir(), ".stashit");
const BACKUP_FILE = join(BACKUP_DIR, "backup.json");

export interface BackupData {
  version: number;
  exportedAt: string;
  active: QueueItem[];
  archive: QueueItem[];
  settings?: Settings;
}

function ensureBackupDir(): void {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// Schedule a debounced sync - waits 2 seconds after last change
function scheduleSyncToFile(): void {
  syncPending = true;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(() => {
    performSyncToFile();
  }, 2000);
}

// Internal sync function - writes current LocalStorage state to file (async, non-blocking)
async function performSyncToFile(): Promise<void> {
  if (!syncPending) return;
  syncPending = false;

  try {
    ensureBackupDir();

    // Read directly from LocalStorage to avoid circular calls
    const queueData = await LocalStorage.getItem<string>(STORAGE_KEY);
    const archiveData = await LocalStorage.getItem<string>(ARCHIVE_KEY);
    const settingsData = await LocalStorage.getItem<string>(SETTINGS_KEY);

    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      active: queueData ? JSON.parse(queueData) : [],
      archive: archiveData ? JSON.parse(archiveData) : [],
      settings: settingsData
        ? JSON.parse(settingsData)
        : { retentionDays: DEFAULT_RETENTION_DAYS },
    };

    // Async write - non-blocking
    writeFile(BACKUP_FILE, JSON.stringify(backup, null, 2), (err) => {
      if (err) console.error("Failed to sync to file:", err);
    });
  } catch (error) {
    console.error("Failed to sync to file:", error);
  }
}

// Force immediate sync (for manual backup)
async function syncToFile(): Promise<void> {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  syncPending = true;
  await performSyncToFile();
}

export async function backupToFile(): Promise<string> {
  await syncToFile();
  return BACKUP_FILE;
}

export async function restoreFromFile(): Promise<{
  activeCount: number;
  archiveCount: number;
} | null> {
  if (!existsSync(BACKUP_FILE)) {
    return null;
  }

  const data = readFileSync(BACKUP_FILE, "utf-8");
  const backup = JSON.parse(data) as BackupData;

  // Save directly to LocalStorage without triggering sync (avoid writing same data back)
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(backup.active));
  await LocalStorage.setItem(ARCHIVE_KEY, JSON.stringify(backup.archive));
  if (backup.settings) {
    await LocalStorage.setItem(SETTINGS_KEY, JSON.stringify(backup.settings));
  }

  return {
    activeCount: backup.active.length,
    archiveCount: backup.archive.length,
  };
}

export function getBackupPath(): string {
  return BACKUP_FILE;
}

export function backupExists(): boolean {
  return existsSync(BACKUP_FILE);
}

export function getBackupInfo(): {
  exists: boolean;
  path: string;
  modifiedAt?: Date;
} {
  const exists = existsSync(BACKUP_FILE);
  if (!exists) {
    return { exists: false, path: BACKUP_FILE };
  }

  try {
    const data = readFileSync(BACKUP_FILE, "utf-8");
    const backup = JSON.parse(data) as BackupData;
    return {
      exists: true,
      path: BACKUP_FILE,
      modifiedAt: new Date(backup.exportedAt),
    };
  } catch {
    return { exists: true, path: BACKUP_FILE };
  }
}
