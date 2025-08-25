/**
 * Configuration service implementation wrapping existing config-manager functions
 * Provides abstraction layer following Dependency Inversion Principle
 */

import { StorageResult } from "../../types";
import { ClaudeDesktopConfig, ConfigStatus, IConfigurationService } from "../interfaces/IConfigurationService";
import {
  readClaudeConfig,
  writeClaudeConfig,
  backupConfig,
  restoreConfig,
  listBackups,
  cleanupOldBackups,
  getConfigStatus,
} from "../../utils/config-manager";

export class ConfigurationService implements IConfigurationService {
  async readConfiguration(): Promise<StorageResult<ClaudeDesktopConfig>> {
    try {
      const result = await readClaudeConfig();
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async writeConfiguration(config: ClaudeDesktopConfig, reason = "profile_switch"): Promise<StorageResult<boolean>> {
    try {
      // Validate configuration structure first
      if (!this.validateConfigurationStructure(config)) {
        return {
          success: false,
          error: "Invalid configuration structure",
        };
      }

      const result = await writeClaudeConfig(config, reason);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async createBackup(reason = "manual"): Promise<StorageResult<string>> {
    try {
      const result = await backupConfig(reason);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async restoreConfiguration(backupPath: string): Promise<StorageResult<boolean>> {
    try {
      const result = await restoreConfig(backupPath);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async listBackups(): Promise<StorageResult<string[]>> {
    try {
      const result = await listBackups();
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async cleanupOldBackups(keepCount = 10): Promise<StorageResult<number>> {
    try {
      const result = await cleanupOldBackups(keepCount);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getConfigurationStatus(): Promise<StorageResult<ConfigStatus>> {
    try {
      const result = await getConfigStatus();
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  validateConfigurationStructure(config: unknown): boolean {
    try {
      if (typeof config !== "object" || config === null) {
        return false;
      }

      const configObj = config as Record<string, unknown>;

      // If mcpServers exists, it should be an object
      if (configObj.mcpServers !== undefined) {
        if (typeof configObj.mcpServers !== "object" || configObj.mcpServers === null) {
          return false;
        }

        // Validate each MCP server configuration
        const mcpServers = configObj.mcpServers as Record<string, unknown>;
        for (const [serverName, serverConfig] of Object.entries(mcpServers)) {
          if (!this.validateServerConfiguration(serverName, serverConfig)) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.warn("Error validating configuration structure:", error);
      return false;
    }
  }

  private validateServerConfiguration(serverName: string, config: unknown): boolean {
    if (typeof config !== "object" || config === null) {
      return false;
    }

    const serverConfig = config as Record<string, unknown>;

    // Required fields
    if (typeof serverConfig.command !== "string" || serverConfig.command.trim().length === 0) {
      return false;
    }

    if (!Array.isArray(serverConfig.args)) {
      return false;
    }

    // Validate args array
    if (!serverConfig.args.every((arg) => typeof arg === "string")) {
      return false;
    }

    // Optional env field validation
    if (serverConfig.env !== undefined) {
      if (typeof serverConfig.env !== "object" || serverConfig.env === null || Array.isArray(serverConfig.env)) {
        return false;
      }

      // Validate env values
      const env = serverConfig.env as Record<string, unknown>;
      if (!Object.values(env).every((value) => typeof value === "string")) {
        return false;
      }
    }

    return true;
  }
}
