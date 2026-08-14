import { getPreferenceValues } from "@raycast/api";

export type DirectoryPreferenceType = "prompts" | "scripts";

interface BasePreferences {
  primaryAction?: string;
  customEditor?: string;
}

interface PromptsPreferences extends BasePreferences {
  customPromptsDirectory?: string;
  customPromptsDirectory1?: string;
  customPromptsDirectory2?: string;
  customPromptsDirectory3?: string;
  customPromptsDirectory4?: string;
}

interface ScriptsPreferences extends BasePreferences {
  scriptsDirectory?: string;
  scriptsDirectory1?: string;
  scriptsDirectory2?: string;
}

interface CompletePreferences extends PromptsPreferences, ScriptsPreferences {}

class ConfigurationManager {
  private static instance: ConfigurationManager;
  private cache: Map<string, string[]> = new Map();

  private constructor() {}

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  getDirectories(type: DirectoryPreferenceType): string[] {
    const cacheKey = `directories_${type}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let directories: string[] = [];

    switch (type) {
      case "prompts":
        directories = this.getPromptDirectories();
        break;
      case "scripts":
        directories = this.getScriptDirectories();
        break;
    }

    directories = directories.filter((dir): dir is string => typeof dir === "string" && dir.trim() !== "");

    this.cache.set(cacheKey, directories);
    return directories;
  }

  private getPromptDirectories(): string[] {
    const preferences = getPreferenceValues<PromptsPreferences>();
    return [
      preferences.customPromptsDirectory,
      preferences.customPromptsDirectory1,
      preferences.customPromptsDirectory2,
      preferences.customPromptsDirectory3,
      preferences.customPromptsDirectory4,
    ].filter(Boolean) as string[];
  }

  private getScriptDirectories(): string[] {
    const preferences = getPreferenceValues<ScriptsPreferences>();
    return [preferences.scriptsDirectory, preferences.scriptsDirectory1, preferences.scriptsDirectory2].filter(
      Boolean,
    ) as string[];
  }

  getPreference<K extends keyof CompletePreferences>(key: K): CompletePreferences[K] {
    const preferences = getPreferenceValues<CompletePreferences>();
    return preferences[key];
  }

  getAllPreferences(): CompletePreferences {
    return getPreferenceValues<CompletePreferences>();
  }

  clearCache(): void {
    this.cache.clear();
  }

  refreshCache(type: DirectoryPreferenceType): void {
    const cacheKey = `directories_${type}`;
    this.cache.delete(cacheKey);
  }
}

const configurationManager = ConfigurationManager.getInstance();
export default configurationManager;

export type { PromptsPreferences, ScriptsPreferences, CompletePreferences };
