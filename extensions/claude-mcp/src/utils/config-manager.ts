/**
 * Configuration file manager for Claude Desktop
 * Handles reading, writing, backing up, and restoring Claude Desktop configuration
 */

import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { MCPServersConfig, StorageResult } from "../types";

// Configuration paths
const CLAUDE_CONFIG_DIR = join(homedir(), "Library", "Application Support", "Claude");
const CLAUDE_CONFIG_PATH = join(CLAUDE_CONFIG_DIR, "claude_desktop_config.json");
const BACKUP_DIR = join(CLAUDE_CONFIG_DIR, "backups");

// Claude Desktop configuration interface
interface ClaudeDesktopConfig {
  mcpServers?: MCPServersConfig;
  [key: string]: unknown; // Allow other configuration options
}

// Backup metadata interface
interface BackupMetadata {
  timestamp: string;
  originalPath: string;
  backupPath: string;
  reason: string;
}

/**
 * Ensure directory exists, create if it doesn't
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename(reason = "manual"): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `claude_desktop_config_${timestamp}_${reason}.json`;
}

/**
 * Generate backup metadata filename
 */
function generateBackupMetadataFilename(backupFilename: string): string {
  return backupFilename.replace(".json", "_metadata.json");
}

/**
 * Check if file exists and is accessible
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if file is readable
 */
async function isFileReadable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if file is writable
 */
async function isFileWritable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if directory is writable (for creating new files)
 */
async function isDirectoryWritable(dirPath: string): Promise<boolean> {
  try {
    await fs.access(dirPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate JSON structure
 */
function validateConfigStructure(config: unknown): config is ClaudeDesktopConfig {
  if (typeof config !== "object" || config === null) {
    return false;
  }

  const configObj = config as Record<string, unknown>;

  // If mcpServers exists, it should be an object
  if (configObj.mcpServers !== undefined) {
    if (typeof configObj.mcpServers !== "object" || configObj.mcpServers === null) {
      return false;
    }
  }

  return true;
}

/**
 * Read Claude Desktop configuration file
 */
export async function readClaudeConfig(): Promise<StorageResult<ClaudeDesktopConfig>> {
  try {
    // Check if config file exists
    if (!(await fileExists(CLAUDE_CONFIG_PATH))) {
      return {
        success: true,
        data: {}, // Return empty config if file doesn't exist
      };
    }

    // Check if file is readable
    if (!(await isFileReadable(CLAUDE_CONFIG_PATH))) {
      return {
        success: false,
        error: `Configuration file is not readable: ${CLAUDE_CONFIG_PATH}`,
      };
    }

    // Read and parse configuration
    const configContent = await fs.readFile(CLAUDE_CONFIG_PATH, "utf-8");

    if (configContent.trim() === "") {
      return {
        success: true,
        data: {},
      };
    }

    let config: unknown;
    try {
      config = JSON.parse(configContent);
    } catch (parseError) {
      return {
        success: false,
        error: `Invalid JSON in configuration file: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      };
    }

    // Validate structure
    if (!validateConfigStructure(config)) {
      return {
        success: false,
        error: "Configuration file has invalid structure",
      };
    }

    return {
      success: true,
      data: config,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read configuration: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Write Claude Desktop configuration file using atomic operations
 */
export async function writeClaudeConfig(
  config: ClaudeDesktopConfig,
  reason = "profile_switch",
): Promise<StorageResult<boolean>> {
  try {
    // Validate input config
    if (!validateConfigStructure(config)) {
      return {
        success: false,
        error: "Invalid configuration structure",
      };
    }

    // Ensure Claude config directory exists
    await ensureDirectoryExists(CLAUDE_CONFIG_DIR);

    // Check directory permissions
    if (!(await isDirectoryWritable(CLAUDE_CONFIG_DIR))) {
      return {
        success: false,
        error: `No write permission for Claude config directory: ${CLAUDE_CONFIG_DIR}`,
      };
    }

    // Create backup before writing
    const backupResult = await backupConfig(reason);
    if (!backupResult.success) {
      return {
        success: false,
        error: `Failed to create backup before writing: ${backupResult.error}`,
      };
    }

    // Prepare config content
    const configContent = JSON.stringify(config, null, 2);

    // Atomic write: write to temporary file first
    const tempPath = `${CLAUDE_CONFIG_PATH}.tmp.${Date.now()}`;

    try {
      await fs.writeFile(tempPath, configContent, "utf-8");

      // Verify the temporary file was written correctly
      const verifyContent = await fs.readFile(tempPath, "utf-8");
      if (verifyContent !== configContent) {
        throw new Error("Temporary file content verification failed");
      }

      // Atomic move: rename temp file to actual config file
      await fs.rename(tempPath, CLAUDE_CONFIG_PATH);

      return {
        success: true,
        data: true,
      };
    } catch (writeError) {
      // Clean up temporary file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }

      throw writeError;
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to write configuration: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Create backup of current Claude Desktop configuration
 */
export async function backupConfig(reason = "manual"): Promise<StorageResult<string>> {
  try {
    // Check if config file exists
    if (!(await fileExists(CLAUDE_CONFIG_PATH))) {
      return {
        success: false,
        error: "No configuration file to backup",
      };
    }

    // Ensure backup directory exists
    await ensureDirectoryExists(BACKUP_DIR);

    // Check backup directory permissions
    if (!(await isDirectoryWritable(BACKUP_DIR))) {
      return {
        success: false,
        error: `No write permission for backup directory: ${BACKUP_DIR}`,
      };
    }

    // Generate backup filename
    const backupFilename = generateBackupFilename(reason);
    const backupPath = join(BACKUP_DIR, backupFilename);
    const metadataFilename = generateBackupMetadataFilename(backupFilename);
    const metadataPath = join(BACKUP_DIR, metadataFilename);

    // Read current config
    const configContent = await fs.readFile(CLAUDE_CONFIG_PATH, "utf-8");

    // Create backup
    await fs.writeFile(backupPath, configContent, "utf-8");

    // Create metadata
    const metadata: BackupMetadata = {
      timestamp: new Date().toISOString(),
      originalPath: CLAUDE_CONFIG_PATH,
      backupPath,
      reason,
    };

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");

    return {
      success: true,
      data: backupPath,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Restore Claude Desktop configuration from backup
 */
export async function restoreConfig(backupPath: string): Promise<StorageResult<boolean>> {
  try {
    // Check if backup file exists
    if (!(await fileExists(backupPath))) {
      return {
        success: false,
        error: `Backup file not found: ${backupPath}`,
      };
    }

    // Check if backup file is readable
    if (!(await isFileReadable(backupPath))) {
      return {
        success: false,
        error: `Backup file is not readable: ${backupPath}`,
      };
    }

    // Read backup content
    const backupContent = await fs.readFile(backupPath, "utf-8");

    // Validate backup content
    if (backupContent.trim() !== "") {
      try {
        const backupConfig = JSON.parse(backupContent);
        if (!validateConfigStructure(backupConfig)) {
          return {
            success: false,
            error: "Backup file contains invalid configuration structure",
          };
        }
      } catch (parseError) {
        return {
          success: false,
          error: `Backup file contains invalid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        };
      }
    }

    // Ensure Claude config directory exists
    await ensureDirectoryExists(CLAUDE_CONFIG_DIR);

    // Create backup of current config before restore
    const preRestoreBackup = await backupConfig("pre_restore");
    if (!preRestoreBackup.success) {
      console.warn("Warning: Could not create pre-restore backup:", preRestoreBackup.error);
      // Continue with restore anyway
    }

    // Atomic restore: write to temporary file first
    const tempPath = `${CLAUDE_CONFIG_PATH}.restore.${Date.now()}`;

    try {
      await fs.writeFile(tempPath, backupContent, "utf-8");

      // Verify the temporary file was written correctly
      const verifyContent = await fs.readFile(tempPath, "utf-8");
      if (verifyContent !== backupContent) {
        throw new Error("Temporary file content verification failed");
      }

      // Atomic move: rename temp file to actual config file
      await fs.rename(tempPath, CLAUDE_CONFIG_PATH);

      return {
        success: true,
        data: true,
      };
    } catch (restoreError) {
      // Clean up temporary file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }

      throw restoreError;
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to restore configuration: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * List available backup files
 */
export async function listBackups(): Promise<StorageResult<string[]>> {
  try {
    // Check if backup directory exists
    if (!(await fileExists(BACKUP_DIR))) {
      return {
        success: true,
        data: [],
      };
    }

    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter(
        (file) => file.startsWith("claude_desktop_config_") && file.endsWith(".json") && !file.includes("_metadata"),
      )
      .sort()
      .reverse(); // Most recent first

    const backupPaths = backupFiles.map((file) => join(BACKUP_DIR, file));

    return {
      success: true,
      data: backupPaths,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list backups: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Clean up old backup files (keep last N backups)
 */
export async function cleanupOldBackups(keepCount = 10): Promise<StorageResult<number>> {
  try {
    const backupsResult = await listBackups();
    if (!backupsResult.success || !backupsResult.data) {
      return {
        success: false,
        error: "Failed to list backups for cleanup",
      };
    }

    const backups = backupsResult.data;
    if (backups.length <= keepCount) {
      return {
        success: true,
        data: 0, // No backups deleted
      };
    }

    const backupsToDelete = backups.slice(keepCount);
    let deletedCount = 0;

    for (const backupPath of backupsToDelete) {
      try {
        await fs.unlink(backupPath);

        // Also delete corresponding metadata file
        const backupFilename = backupPath.split("/").pop() || "";
        const metadataFilename = generateBackupMetadataFilename(backupFilename);
        const metadataPath = join(BACKUP_DIR, metadataFilename);

        try {
          await fs.unlink(metadataPath);
        } catch {
          // Ignore if metadata file doesn't exist
        }

        deletedCount++;
      } catch (deleteError) {
        console.warn(`Failed to delete backup ${backupPath}:`, deleteError);
        // Continue with other backups
      }
    }

    return {
      success: true,
      data: deletedCount,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to cleanup backups: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get configuration file status and permissions
 */
export async function getConfigStatus(): Promise<
  StorageResult<{
    exists: boolean;
    readable: boolean;
    writable: boolean;
    directoryWritable: boolean;
    size?: number;
    lastModified?: Date;
  }>
> {
  try {
    const exists = await fileExists(CLAUDE_CONFIG_PATH);
    const directoryWritable = await isDirectoryWritable(CLAUDE_CONFIG_DIR);

    let readable = false;
    let writable = false;
    let size: number | undefined;
    let lastModified: Date | undefined;

    if (exists) {
      readable = await isFileReadable(CLAUDE_CONFIG_PATH);
      writable = await isFileWritable(CLAUDE_CONFIG_PATH);

      try {
        const stats = await fs.stat(CLAUDE_CONFIG_PATH);
        size = stats.size;
        lastModified = stats.mtime;
      } catch {
        // Ignore stat errors
      }
    }

    return {
      success: true,
      data: {
        exists,
        readable,
        writable,
        directoryWritable,
        size,
        lastModified,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get config status: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
