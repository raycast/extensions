/**
 * Storage manager for caching parsed NordPass data
 * Handles reading/writing cached data to local file system
 */

import * as fs from "fs";
import * as path from "path";
import { CachedData, Password, CreditCard, SecureNote } from "../types";
import { getCacheFilePath } from "./preferences";
import { parseExportFile, calculateFileHash } from "./parser";
import { getExportFilePath, secureExportFile } from "./preferences";
import { readSecureFile, writeSecureFile } from "./encryption";

/**
 * Load cached data from disk (encrypted)
 */
export function loadCachedData(): CachedData | null {
  const cachePath = getCacheFilePath();

  try {
    if (!fs.existsSync(cachePath)) {
      return null;
    }

    // Read and decrypt the cache file
    const cacheContent = readSecureFile(cachePath);
    return JSON.parse(cacheContent) as CachedData;
  } catch (error) {
    console.error("Error loading cached data:", error);
    // If decryption fails, try to clear the corrupted cache
    try {
      fs.unlinkSync(cachePath);
    } catch {
      // Ignore errors when trying to delete
    }
    return null;
  }
}

/**
 * Save data to cache (encrypted)
 */
export function saveCachedData(data: CachedData): void {
  const cachePath = getCacheFilePath();

  // Ensure the directory exists
  const cacheDir = path.dirname(cachePath);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  try {
    // Encrypt and save with secure permissions
    const jsonData = JSON.stringify(data, null, 2);
    writeSecureFile(cachePath, jsonData, true);
  } catch (error) {
    console.error("Error saving cached data:", error);
    throw error;
  }
}

/**
 * Refresh cache from export file
 */
export function refreshCache(): CachedData {
  const exportFilePath = getExportFilePath();

  if (!exportFilePath) {
    throw new Error("Export file not found. Please set the export file path in preferences.");
  }

  if (!fs.existsSync(exportFilePath)) {
    throw new Error(`Export file not found at: ${exportFilePath}`);
  }

  // Parse the export file
  const { passwords, creditCards, secureNotes } = parseExportFile(exportFilePath);

  // Try to set secure permissions on the export file
  secureExportFile(exportFilePath);

  // Calculate file hash for change detection
  const exportFileHash = calculateFileHash(exportFilePath);

  // Create cached data structure
  const cachedData: CachedData = {
    passwords,
    creditCards,
    secureNotes,
    lastUpdated: Date.now(),
    exportFileHash,
  };

  // Save to cache
  saveCachedData(cachedData);

  return cachedData;
}

/**
 * Get cached data, refreshing if needed
 */
export function getCachedData(forceRefresh: boolean = false): CachedData {
  const exportFilePath = getExportFilePath();

  if (!exportFilePath) {
    throw new Error("Export file not found. Please set the export file path in preferences.");
  }

  // If force refresh, always reload
  if (forceRefresh) {
    return refreshCache();
  }

  // Try to load from cache
  const cached = loadCachedData();

  if (!cached) {
    // No cache exists, create it
    return refreshCache();
  }

  // Check if export file has changed
  if (fs.existsSync(exportFilePath)) {
    const currentHash = calculateFileHash(exportFilePath);

    // If hash changed or cache is older than export file, refresh
    if (cached.exportFileHash !== currentHash) {
      return refreshCache();
    }
  }

  return cached;
}

/**
 * Clear the cache
 */
export function clearCache(): void {
  const cachePath = getCacheFilePath();

  try {
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

/**
 * Get all passwords from cache
 */
export function getPasswords(): Password[] {
  const cached = getCachedData();
  return cached.passwords;
}

/**
 * Get all credit cards from cache
 */
export function getCreditCards(): CreditCard[] {
  const cached = getCachedData();
  return cached.creditCards;
}

/**
 * Get all secure notes from cache
 */
export function getSecureNotes(): SecureNote[] {
  const cached = getCachedData();
  return cached.secureNotes;
}
