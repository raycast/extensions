import * as yaml from "js-yaml";
import { getSelectedFinderItems } from "@raycast/api";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import {
  getCustomApps,
  getAppSettings,
  updateAppSettings,
  addToUsageHistory,
  getUsageHistory,
  defaultApps,
} from "./hooks/apps";
import { addCustomApp } from "./utils/custom-app-utils";
import { YAMLSettings, AppSetting } from "./types";

/**
 * Export all settings to YAML format
 */
export async function exportSettingsToYAML(): Promise<string> {
  try {
    const usageHistory = await getUsageHistory();
    const appSettings = await getAppSettings();
    const customApps = await getCustomApps();

    // Convert app settings to a more readable format
    const appSettingsMap: Record<string, boolean> = {};

    // Add all default apps to settings map with current enabled status
    for (const app of defaultApps) {
      appSettingsMap[app.value] = true; // Default to enabled
    }

    // Override with actual stored settings
    appSettings.forEach((setting) => {
      appSettingsMap[setting.value] = setting.enabled;
    });

    const yamlSettings: YAMLSettings = {
      version: "1.0",
      usageHistory,
      appSettings: appSettingsMap,
      customApps: customApps.map((app) => ({
        name: app.name,
        value: app.value,
        urlTemplate: app.urlTemplate,
        enabled: true, // Custom apps are enabled by default
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

    // Import usage history and create missing apps
    if (settings.usageHistory && Array.isArray(settings.usageHistory)) {
      // Get existing apps to check against
      const existingCustomApps = await getCustomApps();
      const allExistingApps = [...defaultApps, ...existingCustomApps];
      const existingAppValues = new Set(allExistingApps.map((app) => app.value));
      const appsToCreate = new Map<string, { name: string; value: string }>();

      // First pass: identify apps that need to be created
      for (const item of settings.usageHistory) {
        if (item && typeof item === "object" && item.username && item.app && item.appName) {
          if (!existingAppValues.has(item.app)) {
            appsToCreate.set(item.app, {
              name: item.appName,
              value: item.app,
            });
          }
        }
      }

      // Create missing custom apps with placeholder URL templates
      for (const [, appInfo] of appsToCreate) {
        const customAppInput = {
          name: appInfo.name,
          urlTemplate: `https://example.com/{profile}`, // Placeholder URL template
          enabled: true,
        };

        try {
          const result = await addCustomApp(customAppInput);
          if (result.success) {
            console.log(`Created custom app for imported usage history: ${appInfo.name}`);
          } else {
            console.log(`Custom app already exists for usage history: ${appInfo.name}`);
          }
        } catch (error) {
          console.warn(`Failed to create custom app ${appInfo.name}:`, error);
        }
      }

      // Second pass: import usage history
      for (const item of settings.usageHistory.reverse()) {
        if (item && typeof item === "object" && item.username && item.app && item.appName) {
          await addToUsageHistory(item.username, item.app, item.appName);
        }
      }
    }

    // Import app settings
    if (settings.appSettings && typeof settings.appSettings === "object") {
      const appSettings: AppSetting[] = [];

      for (const [appValue, enabled] of Object.entries(settings.appSettings)) {
        if (typeof enabled === "boolean") {
          appSettings.push({
            value: appValue,
            enabled,
          });
        }
      }

      await updateAppSettings(appSettings);
    }

    // Import custom apps with duplicate checking
    if (settings.customApps && Array.isArray(settings.customApps)) {
      const importResults = {
        imported: 0,
        skipped: 0,
        failed: 0,
      };

      for (const app of settings.customApps) {
        if (app && typeof app === "object" && app.name && app.value && app.urlTemplate) {
          const customAppInput = {
            name: app.name.trim(),
            urlTemplate: app.urlTemplate.trim(),
            enabled: true, // Default to enabled for imported apps
          };

          try {
            const result = await addCustomApp(customAppInput);
            if (result.success) {
              importResults.imported++;
              console.log(`Successfully imported custom app: ${app.name}`);
            } else {
              importResults.skipped++;
              console.log(`Skipped duplicate custom app: ${app.name}`);
            }
          } catch (error) {
            importResults.failed++;
            console.warn(`Failed to import custom app ${app.name}:`, error);
          }
        }
      }

      console.log(
        `Import summary - Imported: ${importResults.imported}, Skipped: ${importResults.skipped}, Failed: ${importResults.failed}`,
      );
    }
  } catch (error) {
    console.error("Error importing settings from YAML:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(errorMessage);
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
    return filePath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(errorMessage);
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
    throw new Error(errorMessage);
  }
}

/**
 * Generate a sample YAML settings file content for reference
 */
export function generateSampleYAML(): string {
  const sampleSettings: YAMLSettings = {
    version: "1.0",
    usageHistory: [
      {
        username: "johndoe",
        app: "github",
        appName: "GitHub",
        timestamp: Date.now() - 86400000, // 1 day ago
      },
      {
        username: "janedoe",
        app: "x",
        appName: "X",
        timestamp: Date.now() - 172800000, // 2 days ago
      },
      {
        username: "example_user",
        app: "mastodon",
        appName: "Mastodon",
        timestamp: Date.now() - 259200000, // 3 days ago
      },
    ],
    appSettings: {
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
    customApps: [
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
