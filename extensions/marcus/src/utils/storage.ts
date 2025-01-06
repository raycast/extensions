import { LocalStorage } from "@raycast/api";
import type { JournalEntry, Quote, LifeStats } from "../types";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";

// Storage constants
const STORAGE_KEYS = {
  JOURNAL_ENTRIES: "journal-entries",
  FAVORITE_QUOTES: "favorite-quotes",
  LIFE_STATS: "life-stats",
} as const;

const MARCUS_DIR = join(homedir(), ".marcus");
const BACKUP_DIR = join(MARCUS_DIR, "backups");

// Initialize storage directories
async function ensureDirectories() {
  if (!existsSync(MARCUS_DIR)) {
    await mkdir(MARCUS_DIR, { recursive: true });
  }
  if (!existsSync(BACKUP_DIR)) {
    await mkdir(BACKUP_DIR, { recursive: true });
  }
}

// Error handling wrapper
async function handleStorageOperation<T>(operation: () => Promise<T>, errorMessage: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Journal entries
export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  return handleStorageOperation(async () => {
    await ensureDirectories();
    const entries = await getJournalEntries();
    entries.push(entry);
    await LocalStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(entries));
  }, "Failed to save journal entry");
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  return handleStorageOperation(async () => {
    const entriesStr = await LocalStorage.getItem<string>(STORAGE_KEYS.JOURNAL_ENTRIES);
    return entriesStr ? JSON.parse(entriesStr) : [];
  }, "Failed to load journal entries");
}

export async function deleteJournalEntry(entryId: string): Promise<void> {
  return handleStorageOperation(async () => {
    const entries = await getJournalEntries();
    const updatedEntries = entries.filter((entry) => entry.id !== entryId);
    await LocalStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(updatedEntries));
  }, "Failed to delete journal entry");
}

// Favorite quotes
export async function toggleFavoriteQuote(quote: Quote): Promise<boolean> {
  return handleStorageOperation(async () => {
    const favorites = await getFavoriteQuotes();
    const existingIndex = favorites.findIndex((q) => q.id === quote.id);

    if (existingIndex >= 0) {
      favorites.splice(existingIndex, 1);
      await LocalStorage.setItem(STORAGE_KEYS.FAVORITE_QUOTES, JSON.stringify(favorites));
      return false;
    }

    favorites.push(quote);
    await LocalStorage.setItem(STORAGE_KEYS.FAVORITE_QUOTES, JSON.stringify(favorites));
    return true;
  }, "Failed to toggle favorite quote");
}

export async function getFavoriteQuotes(): Promise<Quote[]> {
  return handleStorageOperation(async () => {
    const favoritesStr = await LocalStorage.getItem<string>(STORAGE_KEYS.FAVORITE_QUOTES);
    return favoritesStr ? JSON.parse(favoritesStr) : [];
  }, "Failed to load favorite quotes");
}

// Life stats
export async function saveLifeStats(stats: LifeStats): Promise<void> {
  return handleStorageOperation(async () => {
    await LocalStorage.setItem(STORAGE_KEYS.LIFE_STATS, JSON.stringify(stats));
  }, "Failed to save life stats");
}

export async function getLifeStats(): Promise<LifeStats | null> {
  return handleStorageOperation(async () => {
    const statsStr = await LocalStorage.getItem<string>(STORAGE_KEYS.LIFE_STATS);
    return statsStr ? JSON.parse(statsStr) : null;
  }, "Failed to load life stats");
}

// Data backup and migration
export async function exportData(): Promise<string> {
  return handleStorageOperation(async () => {
    await ensureDirectories();

    const backup = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      data: {
        entries: await getJournalEntries(),
        favorites: await getFavoriteQuotes(),
        lifeStats: await getLifeStats(),
      },
    };

    const fileName = `marcus-backup-${backup.timestamp.split("T")[0]}.json`;
    const filePath = join(BACKUP_DIR, fileName);

    await writeFile(filePath, JSON.stringify(backup, null, 2), "utf-8");
    return filePath;
  }, "Failed to export data");
}

export async function importData(filePath: string): Promise<void> {
  return handleStorageOperation(async () => {
    const content = await readFile(filePath, "utf-8");
    const backupData = JSON.parse(content);

    if (backupData.data.entries) {
      await LocalStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(backupData.data.entries));
    }
    if (backupData.data.favorites) {
      await LocalStorage.setItem(STORAGE_KEYS.FAVORITE_QUOTES, JSON.stringify(backupData.data.favorites));
    }
    if (backupData.data.lifeStats) {
      await LocalStorage.setItem(STORAGE_KEYS.LIFE_STATS, JSON.stringify(backupData.data.lifeStats));
    }
  }, "Failed to import data");
}
