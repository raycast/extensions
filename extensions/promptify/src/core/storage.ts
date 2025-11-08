import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { HistoryItem, AppSettings, PresetConfig, StorageError } from "./types";
import { STORAGE_KEYS, VALIDATION } from "./constants";
import { generateId } from "../utils/helpers";

export class StorageManager {
  // History operations
  static async saveToHistory(item: Omit<HistoryItem, "id" | "timestamp">): Promise<string> {
    try {
      const preferences = getPreferenceValues<{ maxHistoryItems: string }>();
      const maxItems = Math.min(parseInt(preferences.maxHistoryItems || "50"), VALIDATION.MAX_HISTORY_ITEMS_LIMIT);

      const id = generateId("hist");
      const historyItem: HistoryItem = {
        ...item,
        id,
        timestamp: Date.now(),
      };

      const history = await this.getHistory();
      const updatedHistory = [historyItem, ...history].slice(0, maxItems);

      await LocalStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
      return id;
    } catch (error) {
      throw new StorageError(`Failed to save to history: ${error}`);
    }
  }

  static async getHistory(limit?: number): Promise<HistoryItem[]> {
    try {
      const historyJson = await LocalStorage.getItem(STORAGE_KEYS.HISTORY);
      if (!historyJson) return [];

      const history: HistoryItem[] = JSON.parse(historyJson as string);
      return limit ? history.slice(0, limit) : history;
    } catch (error) {
      throw new StorageError(`Failed to load history: ${error}`);
    }
  }

  static async deleteHistoryItem(id: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const updatedHistory = history.filter((item) => item.id !== id);
      await LocalStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
    } catch (error) {
      throw new StorageError(`Failed to delete history item: ${error}`);
    }
  }

  static async clearHistory(): Promise<void> {
    try {
      await LocalStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch (error) {
      throw new StorageError(`Failed to clear history: ${error}`);
    }
  }

  // Settings operations
  static async getSettings(): Promise<Partial<AppSettings>> {
    try {
      const settingsJson = await LocalStorage.getItem(STORAGE_KEYS.SETTINGS);
      return settingsJson ? JSON.parse(settingsJson as string) : {};
    } catch (error) {
      throw new StorageError(`Failed to load settings: ${error}`);
    }
  }

  static async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      await LocalStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    } catch (error) {
      throw new StorageError(`Failed to update settings: ${error}`);
    }
  }

  // Custom presets
  static async saveCustomPreset(preset: PresetConfig): Promise<void> {
    try {
      const presets = await this.getCustomPresets();

      // upsert: remove existing with same id (if any)
      const existingIndex = presets.findIndex((p) => p.id === preset.id);
      const now = Date.now();

      const toSave: PresetConfig = {
        ...preset,
        isBuiltIn: false,
        createdAt: preset.createdAt || (existingIndex >= 0 ? presets[existingIndex].createdAt : now),
        updatedAt: now,
      };

      if (existingIndex >= 0) {
        presets[existingIndex] = toSave;
      } else {
        presets.push(toSave);
      }

      // enforce max custom presets
      if (presets.length > VALIDATION.MAX_CUSTOM_PRESETS) {
        // keep most recent by updatedAt
        presets.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        const trimmed = presets.slice(0, VALIDATION.MAX_CUSTOM_PRESETS);
        await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(trimmed));
      } else {
        await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(presets));
      }
    } catch (error) {
      throw new StorageError(`Failed to save custom preset: ${error}`);
    }
  }

  static async getCustomPresets(): Promise<PresetConfig[]> {
    try {
      const presetsJson = await LocalStorage.getItem(STORAGE_KEYS.CUSTOM_PRESETS);
      return presetsJson ? JSON.parse(presetsJson as string) : [];
    } catch (error) {
      throw new StorageError(`Failed to load custom presets: ${error}`);
    }
  }

  static async deleteCustomPreset(id: string): Promise<void> {
    try {
      const presets = await this.getCustomPresets();
      const updatedPresets = presets.filter((p) => p.id !== id);
      await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(updatedPresets));
    } catch (error) {
      throw new StorageError(`Failed to delete custom preset: ${error}`);
    }
  }

  // Export a single preset as JSON string (validated)
  static async exportCustomPreset(id: string): Promise<string> {
    try {
      const presets = await this.getCustomPresets();
      const preset = presets.find((p) => p.id === id);
      if (!preset) throw new StorageError(`Preset not found: ${id}`);

      // Minimal validation before export
      if (!preset.name || !preset.systemPrompt) {
        throw new StorageError("Invalid preset: missing name or systemPrompt");
      }

      return JSON.stringify(preset, null, 2);
    } catch (error) {
      throw new StorageError(`Failed to export custom preset: ${error}`);
    }
  }

  // Export all custom presets as JSON string (for backup)
  static async exportAllCustomPresets(): Promise<string> {
    try {
      const presets = await this.getCustomPresets();

      if (presets.length === 0) {
        throw new StorageError("No custom presets to export");
      }

      // Validate all presets before export
      for (const preset of presets) {
        if (!preset.name || !preset.systemPrompt) {
          throw new StorageError(`Invalid preset found: ${preset.id || "unknown"}`);
        }
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
        presetsCount: presets.length,
        presets: presets,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new StorageError(`Failed to export all custom presets: ${error}`);
    }
  }

  // Import a preset from JSON string. Options: overwrite (if id exists) or generate new id.
  static async importCustomPreset(json: string, options?: { overwrite?: boolean }): Promise<PresetConfig> {
    try {
      const parsed = JSON.parse(json) as Partial<PresetConfig>;

      // Basic shape validation
      if (!parsed.name || !parsed.systemPrompt) {
        throw new StorageError("Invalid preset JSON: missing required fields (name, systemPrompt)");
      }

      const presets = await this.getCustomPresets();

      // determine id
      let id = parsed.id || generateId("preset");
      const existingIndex = presets.findIndex((p) => p.id === id);

      if (existingIndex >= 0 && !options?.overwrite) {
        // generate unique id to avoid overwrite
        id = generateId("preset");
      }

      const now = Date.now();

      const toSave: PresetConfig = {
        id,
        name: parsed.name!,
        description: parsed.description || "",
        systemPrompt: parsed.systemPrompt!,
        tags: parsed.tags || [],
        isBuiltIn: false,
        examples: parsed.examples || [],
        createdAt: parsed.createdAt || now,
        updatedAt: now,
      };

      // upsert
      const idx = presets.findIndex((p) => p.id === toSave.id);
      if (idx >= 0) presets[idx] = toSave;
      else presets.push(toSave);

      // enforce max
      if (presets.length > VALIDATION.MAX_CUSTOM_PRESETS) {
        presets.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        const trimmed = presets.slice(0, VALIDATION.MAX_CUSTOM_PRESETS);
        await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(trimmed));
      } else {
        await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(presets));
      }

      return toSave;
    } catch (error) {
      throw new StorageError(`Failed to import custom preset: ${error}`);
    }
  }

  // Import multiple presets from export file
  static async importAllCustomPresets(
    json: string,
    options?: { overwrite?: boolean; merge?: boolean },
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    try {
      const parsed = JSON.parse(json);

      // Validate export format
      if (!parsed.presets || !Array.isArray(parsed.presets)) {
        throw new StorageError("Invalid export format: missing presets array");
      }

      const existingPresets = await this.getCustomPresets();
      const results = { imported: 0, skipped: 0, errors: [] as string[] };

      // If not merging, clear existing presets first
      if (!options?.merge && !options?.overwrite) {
        await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify([]));
        existingPresets.length = 0;
      }

      for (const presetData of parsed.presets) {
        try {
          // Try to import each preset individually
          await this.importCustomPreset(JSON.stringify(presetData), options);
          results.imported++;
        } catch (error) {
          results.errors.push(`Failed to import preset "${presetData.name || "unknown"}": ${error}`);
          results.skipped++;
        }
      }

      return results;
    } catch (error) {
      throw new StorageError(`Failed to import presets: ${error}`);
    }
  }
}
