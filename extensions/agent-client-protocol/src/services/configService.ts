/**
 * Configuration Service using Raycast LocalStorage
 *
 * Manages agent configurations, user preferences, and security settings
 * using Raycast's native LocalStorage API for persistence.
 */

import { LocalStorage } from "@raycast/api";
import type {
  AgentConfig,
  UserPreferences,
  SecuritySettings,
  ConfigurationService
} from "@/types/extension";
import { STORAGE_KEYS, getDefaultValue } from "@/utils/storageKeys";
import { ErrorCode, type ExtensionError } from "@/types/extension";

export class ConfigService implements ConfigurationService {

  /**
   * Get all agent configurations
   */
  async getAgentConfigs(): Promise<AgentConfig[]> {
    try {
      const stored = await LocalStorage.getItem(STORAGE_KEYS.AGENT_CONFIGS);
      const configsJson = stored || getDefaultValue(STORAGE_KEYS.AGENT_CONFIGS);

      const configs = JSON.parse(configsJson) as AgentConfig[];

      // Add built-in agents if not present
      const builtInAgents = await this.getBuiltInAgents();
      const existingIds = new Set(configs.map(c => c.id));

      for (const builtIn of builtInAgents) {
        if (!existingIds.has(builtIn.id)) {
          configs.unshift(builtIn); // Add built-ins first
        }
      }

      return configs;
    } catch (error) {
      throw this.createError(
        ErrorCode.InvalidConfiguration,
        `Failed to load agent configurations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Save agent configuration
   */
  async saveAgentConfig(config: AgentConfig): Promise<void> {
    try {
      const configs = await this.getAgentConfigs();
      const existingIndex = configs.findIndex(c => c.id === config.id);

      // Update lastUsed timestamp
      const updatedConfig: AgentConfig = {
        ...config,
        lastUsed: new Date()
      };

      if (existingIndex >= 0) {
        // Don't allow overwriting built-in agents
        if (configs[existingIndex].isBuiltIn) {
          throw this.createError(
            ErrorCode.InvalidConfiguration,
            "Cannot modify built-in agent configurations"
          );
        }
        configs[existingIndex] = updatedConfig;
      } else {
        configs.push(updatedConfig);
      }

      // Filter out built-in agents before saving (they're added dynamically)
      const customConfigs = configs.filter(c => !c.isBuiltIn);
      await LocalStorage.setItem(STORAGE_KEYS.AGENT_CONFIGS, JSON.stringify(customConfigs));

    } catch (error) {
      if (error instanceof Error && error.message.includes("built-in")) {
        throw error; // Re-throw our custom error
      }
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to save agent configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete agent configuration
   */
  async deleteAgentConfig(id: string): Promise<void> {
    try {
      const configs = await this.getAgentConfigs();
      const configToDelete = configs.find(c => c.id === id);

      if (!configToDelete) {
        throw this.createError(ErrorCode.InvalidConfiguration, `Agent configuration not found: ${id}`);
      }

      if (configToDelete.isBuiltIn) {
        throw this.createError(ErrorCode.InvalidConfiguration, "Cannot delete built-in agent configurations");
      }

      const updatedConfigs = configs.filter(c => c.id !== id && !c.isBuiltIn);
      await LocalStorage.setItem(STORAGE_KEYS.AGENT_CONFIGS, JSON.stringify(updatedConfigs));

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
        `Failed to delete agent configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get default agent ID
   */
  async getDefaultAgent(): Promise<string | null> {
    try {
      const stored = await LocalStorage.getItem(STORAGE_KEYS.DEFAULT_AGENT);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get default agent:', error);
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
      const agentExists = configs.some(c => c.id === agentId);

      if (!agentExists) {
        throw this.createError(ErrorCode.InvalidConfiguration, `Agent not found: ${agentId}`);
      }

      await LocalStorage.setItem(STORAGE_KEYS.DEFAULT_AGENT, JSON.stringify(agentId));
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to set default agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    try {
      const stored = await LocalStorage.getItem(STORAGE_KEYS.PREFERENCES);
      const prefsJson = stored || getDefaultValue(STORAGE_KEYS.PREFERENCES);
      return JSON.parse(prefsJson) as UserPreferences;
    } catch (error) {
      throw this.createError(
        ErrorCode.InvalidConfiguration,
        `Failed to load preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        `Failed to update preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get security settings
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    try {
      const stored = await LocalStorage.getItem(STORAGE_KEYS.SECURITY_SETTINGS);
      const settingsJson = stored || getDefaultValue(STORAGE_KEYS.SECURITY_SETTINGS);
      return JSON.parse(settingsJson) as SecuritySettings;
    } catch (error) {
      throw this.createError(
        ErrorCode.InvalidConfiguration,
        `Failed to load security settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<void> {
    try {
      const current = await this.getSecuritySettings();
      const updated = { ...current, ...settings };
      await LocalStorage.setItem(STORAGE_KEYS.SECURITY_SETTINGS, JSON.stringify(updated));
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to update security settings: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        `Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        version: "1.0.0"
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`
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
          if (!config.isBuiltIn) { // Only import custom agents
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
        `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Private: Get built-in agent configurations
   */
  private async getBuiltInAgents(): Promise<AgentConfig[]> {
    return [
      {
        id: "gemini-cli",
        name: "Gemini CLI",
        type: "subprocess",
        command: "gemini",
        args: ["--acp"],
        workingDirectory: process.cwd(),
        isBuiltIn: true,
        description: "Google's Gemini AI agent with ACP support",
        createdAt: new Date("2025-01-01"), // Static date for built-ins
      }
    ];
  }

  /**
   * Private: Create standardized error objects
   */
  private createError(code: ErrorCode, message: string, context?: Record<string, unknown>): ExtensionError {
    return {
      code,
      message,
      details: context ? JSON.stringify(context, null, 2) : '',
      timestamp: new Date(),
      context
    };
  }
}