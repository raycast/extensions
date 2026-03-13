/**
 * Storage Migration Utilities
 *
 * Handles data model updates and migrations for LocalStorage data
 * when the extension schema changes between versions.
 */

import { LocalStorage } from "@raycast/api";
import { STORAGE_VERSION, STORAGE_VERSION_KEY, STORAGE_KEYS } from "./storageKeys";
import { createLogger } from "./logging";
import type { ConversationSession } from "@/types/entities";

const logger = createLogger("Migrations");

export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  migrationsApplied: string[];
  errors: string[];
  backupCreated: boolean;
}

/**
 * Migration function type
 */
type MigrationFn = () => Promise<void>;

/**
 * Migration registry mapping version to migration functions
 */
const MIGRATIONS: Record<string, MigrationFn> = {
  "1.0.0": migration_1_0_0,
  "1.1.0": migration_1_1_0,
  "1.2.0": migration_1_2_0,
};

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<MigrationResult> {
  logger.info("Starting migration check");

  const currentVersion = await LocalStorage.getItem(STORAGE_VERSION_KEY);
  const fromVersion = typeof currentVersion === "string" ? currentVersion : "0.0.0";

  const result: MigrationResult = {
    success: true,
    fromVersion,
    toVersion: STORAGE_VERSION,
    migrationsApplied: [],
    errors: [],
    backupCreated: false,
  };

  // No migration needed if already on current version
  if (fromVersion === STORAGE_VERSION) {
    logger.info("No migration needed", { currentVersion: fromVersion });
    return result;
  }

  try {
    // Create backup before migrating
    result.backupCreated = await createBackup(fromVersion);

    // Apply migrations in order
    const pendingMigrations = getPendingMigrations(fromVersion, STORAGE_VERSION);

    for (const [version, migration] of pendingMigrations) {
      try {
        logger.info(`Applying migration: ${version}`);
        await migration();
        result.migrationsApplied.push(version);
      } catch (error) {
        const errorMessage = `Migration ${version} failed: ${error instanceof Error ? error.message : "Unknown error"}`;
        logger.error(errorMessage, { error });
        result.errors.push(errorMessage);
        result.success = false;

        // Attempt to restore backup on failure
        if (result.backupCreated) {
          await restoreBackup(fromVersion);
        }

        return result;
      }
    }

    // Update version marker on success
    await LocalStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    logger.info("Migration completed successfully", {
      fromVersion,
      toVersion: STORAGE_VERSION,
      migrationsApplied: result.migrationsApplied,
    });
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : "Unknown migration error");
    logger.error("Migration failed", { error });
  }

  return result;
}

/**
 * Get list of pending migrations to apply
 */
function getPendingMigrations(fromVersion: string, toVersion: string): Array<[string, MigrationFn]> {
  const versions = Object.keys(MIGRATIONS).sort(compareVersions);
  const pendingMigrations: Array<[string, MigrationFn]> = [];

  for (const version of versions) {
    if (compareVersions(version, fromVersion) > 0 && compareVersions(version, toVersion) <= 0) {
      const migration = MIGRATIONS[version];
      if (migration) {
        pendingMigrations.push([version, migration]);
      }
    }
  }

  return pendingMigrations;
}

/**
 * Compare semantic version strings
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;

    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }

  return 0;
}

/**
 * Create backup of current storage data
 */
async function createBackup(version: string): Promise<boolean> {
  try {
    const backupKey = `${STORAGE_VERSION_KEY}_backup_${version}_${Date.now()}`;
    const allItems = await LocalStorage.allItems();

    await LocalStorage.setItem(backupKey, JSON.stringify(allItems));
    logger.info("Backup created", { backupKey });
    return true;
  } catch (error) {
    logger.error("Failed to create backup", { error });
    return false;
  }
}

/**
 * Restore from backup
 */
async function restoreBackup(version: string): Promise<boolean> {
  try {
    // Find most recent backup for this version
    const allItems = await LocalStorage.allItems();
    const backupKeys = Object.keys(allItems).filter((key) =>
      key.startsWith(`${STORAGE_VERSION_KEY}_backup_${version}_`),
    );

    if (backupKeys.length === 0) {
      logger.warn("No backup found to restore");
      return false;
    }

    // Get most recent backup
    const latestBackupKey = backupKeys.sort().reverse()[0];
    const backupData = await LocalStorage.getItem(latestBackupKey);

    if (!backupData) {
      logger.warn("Backup data not found");
      return false;
    }

    const backup = JSON.parse(String(backupData));

    // Restore all items
    for (const [key, value] of Object.entries(backup)) {
      await LocalStorage.setItem(key, String(value));
    }

    logger.info("Backup restored successfully", { backupKey: latestBackupKey });
    return true;
  } catch (error) {
    logger.error("Failed to restore backup", { error });
    return false;
  }
}

/**
 * Migration: 1.0.0 - Initial schema
 * No changes needed, just set version marker
 */
async function migration_1_0_0(): Promise<void> {
  logger.info("Running migration 1.0.0");
  // No-op migration for initial version
}

/**
 * Migration: 1.1.0 - Add message metadata sequence numbers
 * Ensures all messages have proper sequence numbers
 */
async function migration_1_1_0(): Promise<void> {
  logger.info("Running migration 1.1.0");

  try {
    const conversationsJson = await LocalStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (!conversationsJson) return;

    const conversations = JSON.parse(String(conversationsJson)) as ConversationSession[];

    for (const conversation of conversations) {
      // Add sequence numbers to messages if missing
      conversation.messages = conversation.messages.map((msg, index) => ({
        ...msg,
        metadata: {
          ...msg.metadata,
          sequence: msg.metadata.sequence ?? index,
        },
      }));
    }

    await LocalStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    logger.info("Migration 1.1.0 completed", { conversationsUpdated: conversations.length });
  } catch (error) {
    logger.error("Migration 1.1.0 failed", { error });
    throw error;
  }
}

/**
 * Migration: 1.2.0 - Add agentConfigId to conversations
 * Migrates from agentConnectionId to agentConfigId for better clarity
 */
async function migration_1_2_0(): Promise<void> {
  logger.info("Running migration 1.2.0");

  try {
    const conversationsJson = await LocalStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (!conversationsJson) return;

    const conversations = JSON.parse(String(conversationsJson)) as Array<
      ConversationSession & { agentConnectionId?: string }
    >;

    for (const conversation of conversations) {
      // Migrate agentConnectionId to agentConfigId if needed
      if (!conversation.agentConfigId && conversation.agentConnectionId) {
        conversation.agentConfigId = conversation.agentConnectionId;
        // Remove old property
        delete (conversation as { agentConnectionId?: string }).agentConnectionId;
      }
    }

    await LocalStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    logger.info("Migration 1.2.0 completed", { conversationsUpdated: conversations.length });
  } catch (error) {
    logger.error("Migration 1.2.0 failed", { error });
    throw error;
  }
}

/**
 * Clean up old migration backups
 */
export async function cleanupOldBackups(daysToKeep: number = 7): Promise<number> {
  try {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    const allItems = await LocalStorage.allItems();
    let cleanedCount = 0;

    for (const key of Object.keys(allItems)) {
      if (key.startsWith(`${STORAGE_VERSION_KEY}_backup_`)) {
        // Extract timestamp from backup key
        const parts = key.split("_");
        const timestamp = parseInt(parts[parts.length - 1]);

        if (timestamp < cutoffTime) {
          await LocalStorage.removeItem(key);
          cleanedCount++;
        }
      }
    }

    logger.info("Old backups cleaned up", { cleanedCount });
    return cleanedCount;
  } catch (error) {
    logger.error("Failed to cleanup old backups", { error });
    return 0;
  }
}

/**
 * Validate storage integrity
 */
export async function validateStorageIntegrity(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const result = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[],
  };

  try {
    // Check conversations
    const conversationsJson = await LocalStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (conversationsJson) {
      try {
        const conversations = JSON.parse(String(conversationsJson)) as ConversationSession[];

        if (!Array.isArray(conversations)) {
          result.errors.push("Conversations data is not an array");
          result.isValid = false;
        } else {
          for (const [index, conv] of conversations.entries()) {
            if (!conv.sessionId) {
              result.errors.push(`Conversation at index ${index} missing sessionId`);
              result.isValid = false;
            }
            if (!Array.isArray(conv.messages)) {
              result.errors.push(`Conversation ${conv.sessionId} has invalid messages array`);
              result.isValid = false;
            }
            if (conv.messages.length > 200) {
              result.warnings.push(
                `Conversation ${conv.sessionId} has ${conv.messages.length} messages (consider archiving)`,
              );
            }
          }
        }
      } catch (error) {
        result.errors.push("Failed to parse conversations JSON");
        result.isValid = false;
        logger.error("Failed to parse conversations JSON during validation", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Check version marker
    const version = await LocalStorage.getItem(STORAGE_VERSION_KEY);
    if (!version) {
      result.warnings.push("Storage version marker not found");
    } else if (version !== STORAGE_VERSION) {
      result.warnings.push(`Storage version mismatch: ${version} vs ${STORAGE_VERSION}`);
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : "Unknown validation error");
    result.isValid = false;
    logger.error("Storage validation failed", { error });
  }

  return result;
}
