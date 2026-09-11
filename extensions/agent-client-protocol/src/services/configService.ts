/**
 * Configuration Service using Raycast LocalStorage
 *
 * Manages agent configurations, user preferences, and security settings
 * using Raycast's native LocalStorage API for persistence.
 */

import { LocalStorage } from "@raycast/api";
import type { AgentConfig, UserPreferences, SecuritySettings, ConfigurationService } from "@/types/extension";
import { STORAGE_KEYS, getDefaultValue } from "@/utils/storageKeys";
import { ErrorCode, type ExtensionError } from "@/types/extension";
import { BUILT_IN_AGENTS } from "@/utils/builtInAgents";
import { createLogger } from "@/utils/logging";

const logger = createLogger("ConfigService");

export class ConfigService implements ConfigurationService {
  /**
   * Get all agent configurations
   */
  async getAgentConfigs(): Promise<AgentConfig[]> {
    try {
      const stored = await LocalStorage.getItem(STORAGE_KEYS.AGENT_CONFIGS);
      const configsJson = typeof stored === "string" ? stored : getDefaultValue(STORAGE_KEYS.AGENT_CONFIGS);

      const parsed = JSON.parse(configsJson) as AgentConfig[];
      const storedConfigs = parsed.map((config) => this.normalizeAgentConfig(config));

      const builtInMap = new Map<string, AgentConfig>();
      for (const builtIn of BUILT_IN_AGENTS) {
        builtInMap.set(
          builtIn.id,
          this.normalizeAgentConfig({
            ...builtIn,
            createdAt: builtIn.createdAt ?? new Date("2025-01-01"),
            isBuiltIn: true,
          }),
        );
      }

      for (const config of storedConfigs) {
        const existing = builtInMap.get(config.id);
        if (existing) {
          builtInMap.set(config.id, {
            ...existing,
            ...config,
            createdAt: existing.createdAt,
            isBuiltIn: existing.isBuiltIn ?? config.isBuiltIn,
            lastUsed: config.lastUsed ?? existing.lastUsed,
          });
        } else {
          builtInMap.set(config.id, config);
        }
      }

      const merged = Array.from(builtInMap.values());
      merged.sort((a, b) => {
        const aBuiltIn = Boolean(a.isBuiltIn);
        const bBuiltIn = Boolean(b.isBuiltIn);

        if (aBuiltIn === bBuiltIn) {
          return a.name.localeCompare(b.name);
        }

        return aBuiltIn ? -1 : 1;
      });

      return merged;
    } catch (error) {
      throw this.createError(
        ErrorCode.InvalidConfiguration,
        `Failed to load agent configurations: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Save agent configuration
   */
  async saveAgentConfig(config: AgentConfig): Promise<void> {
    try {
      const configs = await this.getAgentConfigs();
      const existingIndex = configs.findIndex((c) => c.id === config.id);

      const normalizedConfig = this.normalizeAgentConfig({
        ...config,
        createdAt: config.createdAt ?? new Date(),
        lastUsed: new Date(),
      });

      if (existingIndex >= 0) {
        const existing = configs[existingIndex];
        configs[existingIndex] = {
          ...existing,
          ...normalizedConfig,
          createdAt: existing.createdAt,
          isBuiltIn: existing.isBuiltIn ?? normalizedConfig.isBuiltIn,
        };
      } else {
        configs.push(normalizedConfig);
      }

      await this.persistAgentConfigs(configs);
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to save agent configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Delete agent configuration
   */
  async deleteAgentConfig(id: string): Promise<void> {
    try {
      const configs = await this.getAgentConfigs();
      const configToDelete = configs.find((c) => c.id === id);

      if (!configToDelete) {
        throw this.createError(ErrorCode.InvalidConfiguration, `Agent configuration not found: ${id}`);
      }

      if (configToDelete.isBuiltIn) {
        throw this.createError(ErrorCode.InvalidConfiguration, "Cannot delete built-in agent configurations");
      }

      const updatedConfigs = configs.filter((c) => c.id !== id);
      await this.persistAgentConfigs(updatedConfigs);

      // Clear default agent if it was deleted
      const defaultAgent = await this.getDefaultAgent();
      if (defaultAgent === id) {
        await LocalStorage.removeItem(STORAGE_KEYS.DEFAULT_AGENT);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("built-in")) {
        throw error; // Re-throw our custom error
      }
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to delete agent configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get default agent ID
   */
  async getDefaultAgent(): Promise<string | null> {
    try {
      const stored = await LocalStorage.getItem(STORAGE_KEYS.DEFAULT_AGENT);
      return stored && typeof stored === "string" ? JSON.parse(stored) : null;
    } catch (error) {
      logger.error("Failed to get default agent", { error });
      return null;
    }
  }

  /**
   * Set default agent ID
   */
  async setDefaultAgent(agentId: string): Promise<void> {
    try {
      // Verify agent exists
      const configs = await this.getAgentConfigs();
      const agentExists = configs.some((c) => c.id === agentId);

      if (!agentExists) {
        throw this.createError(ErrorCode.InvalidConfiguration, `Agent not found: ${agentId}`);
      }

      await LocalStorage.setItem(STORAGE_KEYS.DEFAULT_AGENT, JSON.stringify(agentId));
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to set default agent: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    try {
      const stored = await LocalStorage.getItem(STORAGE_KEYS.PREFERENCES);
      const prefsJson = typeof stored === "string" ? stored : getDefaultValue(STORAGE_KEYS.PREFERENCES);
      return JSON.parse(prefsJson) as UserPreferences;
    } catch (error) {
      throw this.createError(
        ErrorCode.InvalidConfiguration,
        `Failed to load preferences: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const current = await this.getPreferences();
      const updated = { ...current, ...preferences };
      await LocalStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to update preferences: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get security settings
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    try {
      const stored = await LocalStorage.getItem(STORAGE_KEYS.SECURITY_SETTINGS);
      const settingsJson = typeof stored === "string" ? stored : getDefaultValue(STORAGE_KEYS.SECURITY_SETTINGS);
      const parsed = JSON.parse(settingsJson) as SecuritySettings;
      return this.normalizeSecuritySettings(parsed);
    } catch (error) {
      throw this.createError(
        ErrorCode.InvalidConfiguration,
        `Failed to load security settings: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<void> {
    try {
      const current = await this.getSecuritySettings();
      const updated = this.normalizeSecuritySettings({ ...current, ...settings });
      await LocalStorage.setItem(STORAGE_KEYS.SECURITY_SETTINGS, JSON.stringify(updated));
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to update security settings: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Clear all stored data
   */
  async clearAllData(): Promise<void> {
    try {
      await LocalStorage.clear();
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to clear data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Export all configuration data
   */
  async exportData(): Promise<string> {
    try {
      const data = {
        agentConfigs: await this.getAgentConfigs(),
        preferences: await this.getPreferences(),
        securitySettings: await this.getSecuritySettings(),
        defaultAgent: await this.getDefaultAgent(),
        exportDate: new Date().toISOString(),
        version: "1.0.0",
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to export data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Import configuration data
   */
  async importData(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data);

      // Validate import data structure
      if (!parsed.agentConfigs || !parsed.preferences || !parsed.securitySettings) {
        throw new Error("Invalid export data format");
      }

      // Import each section
      if (parsed.agentConfigs && Array.isArray(parsed.agentConfigs)) {
        for (const config of parsed.agentConfigs) {
          if (!config.isBuiltIn) {
            // Only import custom agents
            await this.saveAgentConfig(config);
          }
        }
      }

      if (parsed.preferences) {
        await this.updatePreferences(parsed.preferences);
      }

      if (parsed.securitySettings) {
        await this.updateSecuritySettings(parsed.securitySettings);
      }

      if (parsed.defaultAgent) {
        await this.setDefaultAgent(parsed.defaultAgent);
      }
    } catch (error) {
      throw this.createError(
        ErrorCode.InvalidConfiguration,
        `Failed to import data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Private helper: ensure agent configs have consistent shapes
   */
  private normalizeAgentConfig(config: AgentConfig): AgentConfig {
    return {
      ...config,
      args: config.args ? [...config.args] : config.args,
      environmentVariables: config.environmentVariables
        ? { ...config.environmentVariables }
        : config.environmentVariables,
      appendToPath: config.appendToPath ? [...config.appendToPath] : undefined,
      createdAt: config.createdAt instanceof Date ? config.createdAt : new Date(config.createdAt ?? Date.now()),
      lastUsed: config.lastUsed
        ? config.lastUsed instanceof Date
          ? config.lastUsed
          : new Date(config.lastUsed)
        : undefined,
    };
  }

  /**
   * Private helper: persist agent configs to LocalStorage with ISO dates
   */
  private async persistAgentConfigs(configs: AgentConfig[]): Promise<void> {
    const serializable = configs.map((config) => ({
      ...config,
      createdAt: config.createdAt instanceof Date ? config.createdAt.toISOString() : config.createdAt,
      lastUsed: config.lastUsed instanceof Date ? config.lastUsed.toISOString() : config.lastUsed,
    }));

    await LocalStorage.setItem(STORAGE_KEYS.AGENT_CONFIGS, JSON.stringify(serializable));
  }

  /**
   * Private helper: normalize security settings with defaults
   */
  private normalizeSecuritySettings(settings: SecuritySettings): SecuritySettings {
    return {
      allowFileAccess: Boolean(settings.allowFileAccess),
      allowedDirectories: Array.isArray(settings.allowedDirectories) ? settings.allowedDirectories : [],
      requirePermissionForTools: settings.requirePermissionForTools ?? true,
      enableLogging: Boolean(settings.enableLogging),
      trustedTools: Array.isArray(settings.trustedTools) ? settings.trustedTools : [],
      trustedPaths: Array.isArray(settings.trustedPaths) ? settings.trustedPaths : [],
    };
  }

  /**
   * Private: Create standardized error objects
   */
  private createError(code: ErrorCode, message: string, context?: Record<string, unknown>): ExtensionError {
    return {
      code,
      message,
      details: context ? JSON.stringify(context, null, 2) : "",
      timestamp: new Date(),
      context,
    };
  }
}
