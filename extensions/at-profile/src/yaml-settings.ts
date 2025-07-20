import * as yaml from "js-yaml";
import { showToast, Toast, getSelectedFinderItems } from "@raycast/api";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import {
  Site,
  updatePlatformSettings,
  PlatformSetting,
  defaultSites,
  getUsernameHistory,
  getPlatformSettings,
  getCustomPlatforms,
  addToUsernameHistory,
  addCustomPlatform,
} from "./sites";

// Types for YAML settings structure
export interface YAMLSettings {
  version: string;
  usernameHistory: string[];
  platformSettings: Record<string, boolean>;
  customPlatforms: Array<{
    id?: string;
    name: string;
    value: string;
    urlTemplate: string;
    enabled: boolean;
  }>;
}

/**
 * Export all settings to YAML format
 */
export async function exportSettingsToYAML(): Promise<string> {
  try {
    const usernameHistory = await getUsernameHistory();
    const platformSettings = await getPlatformSettings();
    const customPlatforms = await getCustomPlatforms();

    // Convert platform settings to a more readable format
    const platformSettingsMap: Record<string, boolean> = {};

    // Add all default sites to settings map with current enabled status
    for (const site of defaultSites) {
      platformSettingsMap[site.value] = true; // Default to enabled
    }

    // Override with actual stored settings
    platformSettings.forEach((setting) => {
      platformSettingsMap[setting.value] = setting.enabled;
    });

    const yamlSettings: YAMLSettings = {
      version: "1.0",
      usernameHistory,
      platformSettings: platformSettingsMap,
      customPlatforms: customPlatforms.map((platform) => ({
        name: platform.name,
        value: platform.value,
        urlTemplate: platform.urlTemplate,
        enabled: true, // Custom platforms are enabled by default
      })),
    };

    return yaml.dump(yamlSettings, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });
  } catch (error) {
    console.error("Error exporting settings to YAML:", error);
    throw new Error(`Failed to export settings: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Import settings from YAML format
 */
export async function importSettingsFromYAML(yamlContent: string): Promise<void> {
  try {
    const settings = yaml.load(yamlContent) as YAMLSettings;

    if (!settings || typeof settings !== "object") {
      throw new Error("Invalid YAML format");
    }

    // Validate required fields
    if (!settings.version) {
      throw new Error("Missing version field in YAML settings");
    }

    // Import username history
    if (settings.usernameHistory && Array.isArray(settings.usernameHistory)) {
      for (const username of settings.usernameHistory.reverse()) {
        if (typeof username === "string" && username.trim()) {
          await addToUsernameHistory(username.trim());
        }
      }
    }

    // Import platform settings
    if (settings.platformSettings && typeof settings.platformSettings === "object") {
      const platformSettings: PlatformSetting[] = [];

      for (const [platformValue, enabled] of Object.entries(settings.platformSettings)) {
        if (typeof enabled === "boolean") {
          platformSettings.push({
            value: platformValue,
            enabled,
          });
        }
      }

      await updatePlatformSettings(platformSettings);
    }

    // Import custom platforms
    if (settings.customPlatforms && Array.isArray(settings.customPlatforms)) {
      for (const platform of settings.customPlatforms) {
        if (platform && typeof platform === "object" && platform.name && platform.value && platform.urlTemplate) {
          const customPlatformSite: Site = {
            name: platform.name,
            value: platform.value,
            urlTemplate: platform.urlTemplate,
          };

          try {
            await addCustomPlatform(customPlatformSite);
          } catch (error) {
            console.warn(`Failed to import custom platform ${platform.name}:`, error);
          }
        }
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Settings Imported",
      message: "Your settings have been successfully imported from YAML",
    });
  } catch (error) {
    console.error("Error importing settings from YAML:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    await showToast({
      style: Toast.Style.Failure,
      title: "Import Failed",
      message: errorMessage,
    });
    throw error;
  }
}

/**
 * Export settings to a YAML file in the user's home directory
 */
export async function exportSettingsToFile(filename?: string): Promise<string> {
  const yamlContent = await exportSettingsToYAML();
  const defaultFilename = `at-profile-settings-${new Date().toISOString().split("T")[0]}.yaml`;
  const fileName = filename || defaultFilename;
  const filePath = join(homedir(), fileName);

  try {
    writeFileSync(filePath, yamlContent, "utf8");

    await showToast({
      style: Toast.Style.Success,
      title: "Settings Exported",
      message: `Settings saved to ${fileName}`,
    });

    return filePath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    await showToast({
      style: Toast.Style.Failure,
      title: "Export Failed",
      message: errorMessage,
    });
    throw error;
  }
}

/**
 * Import settings from a YAML file
 */
export async function importSettingsFromFile(filePath?: string): Promise<void> {
  try {
    let targetPath = filePath;

    // If no file path provided, try to get from Finder selection
    if (!targetPath) {
      try {
        const finderItems = await getSelectedFinderItems();
        if (finderItems.length > 0 && finderItems[0].path.endsWith(".yaml")) {
          targetPath = finderItems[0].path;
        }
      } catch {
        // Finder selection failed, continue without it
      }
    }

    if (!targetPath) {
      throw new Error("Please specify a YAML file path or select a YAML file in Finder");
    }

    const yamlContent = readFileSync(targetPath, "utf8");
    await importSettingsFromYAML(yamlContent);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    await showToast({
      style: Toast.Style.Failure,
      title: "Import Failed",
      message: errorMessage,
    });
    throw error;
  }
}

/**
 * Generate a sample YAML settings file content for reference
 */
export function generateSampleYAML(): string {
  const sampleSettings: YAMLSettings = {
    version: "1.0",
    usernameHistory: ["johndoe", "janedoe", "example_user"],
    platformSettings: {
      x: true,
      instagram: true,
      github: true,
      linkedin: false,
      facebook: false,
      reddit: true,
      youtube: true,
      tiktok: false,
      threads: true,
      raycast: true,
    },
    customPlatforms: [
      {
        name: "Mastodon",
        value: "mastodon",
        urlTemplate: "https://mastodon.social/@{profile}",
        enabled: true,
      },
      {
        name: "Dribbble",
        value: "dribbble",
        urlTemplate: "https://dribbble.com/{profile}",
        enabled: true,
      },
    ],
  };

  return yaml.dump(sampleSettings, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });
}
