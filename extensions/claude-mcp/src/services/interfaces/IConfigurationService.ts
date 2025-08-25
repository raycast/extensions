/**
 * Configuration service interface for Claude Desktop configuration management
 * Abstracts config file operations for dependency inversion
 */

import { MCPServersConfig, StorageResult } from "../../types";

export interface ClaudeDesktopConfig {
  mcpServers?: MCPServersConfig;
  [key: string]: unknown; // Allow other configuration options
}

export interface ConfigStatus {
  exists: boolean;
  readable: boolean;
  writable: boolean;
  directoryWritable: boolean;
  size?: number;
  lastModified?: Date;
}

export interface IConfigurationService {
  /**
   * Read Claude Desktop configuration file
   */
  readConfiguration(): Promise<StorageResult<ClaudeDesktopConfig>>;

  /**
   * Write Claude Desktop configuration file using atomic operations
   */
  writeConfiguration(config: ClaudeDesktopConfig, reason?: string): Promise<StorageResult<boolean>>;

  /**
   * Create backup of current Claude Desktop configuration
   */
  createBackup(reason?: string): Promise<StorageResult<string>>;

  /**
   * Restore Claude Desktop configuration from backup
   */
  restoreConfiguration(backupPath: string): Promise<StorageResult<boolean>>;

  /**
   * List available backup files
   */
  listBackups(): Promise<StorageResult<string[]>>;

  /**
   * Clean up old backup files (keep last N backups)
   */
  cleanupOldBackups(keepCount?: number): Promise<StorageResult<number>>;

  /**
   * Get configuration file status and permissions
   */
  getConfigurationStatus(): Promise<StorageResult<ConfigStatus>>;

  /**
   * Validate configuration structure
   */
  validateConfigurationStructure(config: unknown): boolean;
}
