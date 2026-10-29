import { Cache } from "@raycast/api";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseMigrationsFolder, DatabasePath } from "../db";

const INIT_CACHE_KEY = "lastInitializedMigration";
const cache = new Cache();

/**
 * Gets the latest migration timestamp from Drizzle v1 migration folders.
 * Timestamp-based values also invalidate the old cache, which stored a small migration index.
 */
export function getLatestMigrationNumber(): number | null {
  const migrationNumbers = readdirSync(DatabaseMigrationsFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(DatabaseMigrationsFolder, entry.name, "migration.sql")))
    .map((entry) => entry.name.match(/^(\d{14})_/))
    .map((match) => (match ? Number(match[1]) : null))
    .filter((num): num is number => num !== null);

  return migrationNumbers.length ? Math.max(...migrationNumbers) : null;
}

/**
 * Marks the current migration state as initialized
 */
export function markAsInitialized(): void {
  const latestMigration = getLatestMigrationNumber();

  if (latestMigration !== null) {
    cache.set(INIT_CACHE_KEY, latestMigration.toString());
  }
}

/**
 * Checks if initialization is needed
 */
export function needsInitialization(): boolean {
  if (!existsSync(DatabasePath)) return true;

  const cachedMigration = cache.get(INIT_CACHE_KEY);
  const latestMigration = getLatestMigrationNumber();

  // If we can't determine the latest migration, assume initialization is needed
  if (latestMigration === null) {
    return true;
  }

  // If there's no cached migration, this is the first run
  if (!cachedMigration) {
    return true;
  }

  // Check if there are new migrations
  return parseInt(cachedMigration) < latestMigration;
}

/**
 * Gets a user-friendly message about why initialization is needed
 */
export function getInitializationReason(): string {
  const cachedMigration = cache.get(INIT_CACHE_KEY);

  if (!cachedMigration || !existsSync(DatabasePath)) {
    return "Database not initialized. Run 'View Sessions' or 'View Summaries' first.";
  }

  return "Database updates pending. Run 'View Sessions' or 'View Summaries' to update.";
}
