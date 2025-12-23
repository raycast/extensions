import { Cache } from "@raycast/api";
import { readdirSync } from "fs";
import { DatabaseMigrationsFolder } from "../db";

const INIT_CACHE_KEY = "lastInitializedMigration";
const cache = new Cache();

/**
 * Gets the latest migration number by looking at migration file names
 * Migration files follow the pattern: 0000_some_name.sql
 */
export function getLatestMigrationNumber(): number | null {
  // Build an array with all of the migration numbers and return the highest one.
  const migrationNumbers = readdirSync(DatabaseMigrationsFolder)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => file.match(/^(\d+)_/))
    .map((match) => (match ? parseInt(match[1], 10) : null))
    .filter((num): num is number => num !== null);

  return Math.max(...migrationNumbers);
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

  if (!cachedMigration) {
    return "Database not initialized. Run 'View Sessions' or 'View Summaries' first.";
  }

  return "Database updates pending. Run 'View Sessions' or 'View Summaries' to update.";
}
