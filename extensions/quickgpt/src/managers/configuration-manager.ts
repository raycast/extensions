import { getPreferenceValues } from "@raycast/api";

export type DirectoryPreferenceType = "prompts" | "scripts";

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
    const preferences = getPreferenceValues<Preferences.PromptLab>();
    return [
      preferences.customPromptsDirectory,
      preferences.customPromptsDirectory1,
      preferences.customPromptsDirectory2,
      preferences.customPromptsDirectory3,
      preferences.customPromptsDirectory4,
    ].filter(Boolean) as string[];
  }

  private getScriptDirectories(): string[] {
    const preferences = getPreferenceValues<Preferences.PromptLab>();
    return [preferences.scriptsDirectory, preferences.scriptsDirectory1, preferences.scriptsDirectory2].filter(
      Boolean,
    ) as string[];
  }

  getPreference<K extends keyof Preferences.PromptLab>(key: K): Preferences.PromptLab[K] {
    const preferences = getPreferenceValues<Preferences.PromptLab>();
    return preferences[key];
  }

  getAllPreferences(): Preferences.PromptLab {
    return getPreferenceValues<Preferences.PromptLab>();
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
