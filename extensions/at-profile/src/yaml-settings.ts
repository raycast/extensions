import * as yaml from "js-yaml";
import { getSelectedFinderItems } from "@raycast/api";
import { showError, showSuccess, handleError, safeAsyncOperation } from "./utils/errors";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { getCustomApps, getAppSettings, updateAppSettings, addToUsageHistory, getUsageHistory } from "./helpers/apps";
import { defaultApps } from "./utils/default-apps";
import { addCustomApp, addCustomAppForImport } from "./helpers/custom-app-utils";
import { validateAndSanitizeFilename, validateSecurePath } from "./utils/file-security";
import { parseYaml } from "./utils/yaml";
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

    // Create a set of custom app values to exclude from appSettings
    const customAppValues = new Set(customApps.map((app) => app.value));

    // Add all default apps to settings map with current visible status
    for (const app of defaultApps) {
      appSettingsMap[app.value] = true; // Default to visible
    }

    // Override with actual stored settings, but exclude custom apps
    // (custom apps will be handled in the customApps section with their visible state)
    appSettings.forEach((setting) => {
      if (!customAppValues.has(setting.value)) {
        appSettingsMap[setting.value] = setting.visible;
      }
    });

    const yamlSettings: YAMLSettings = {
      version: "1.0",
      usageHistory,
      visible: appSettingsMap,
      customApps: customApps.map((app) => {
        // Find the actual visible state from app settings
        const appSetting = appSettings.find((setting) => setting.value === app.value);
        return {
          name: app.name,
          value: app.value,
          urlTemplate: app.urlTemplate,
          visible: appSetting ? appSetting.visible : true, // Use actual state or default to visible
        };
      }),
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
    const settings = parseYaml(yamlContent) as YAMLSettings;

    if (!settings || typeof settings !== "object") {
      throw new Error("Invalid YAML format");
    }

    // Validate required fields
    if (!settings.version) {
      throw new Error("Missing version field in YAML settings");
    }

    // Check version compatibility
    if (settings.version !== "1.0") {
      console.warn(`Unknown settings version: ${settings.version}, attempting import anyway...`);
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
        if (item && typeof item === "object" && item.profile && item.app && item.appName) {
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

        const result = await safeAsyncOperation(
          () => addCustomApp(customAppInput),
          `Create custom app for usage history: ${appInfo.name}`,
          { showToastOnError: false }, // Don't show toast for individual items
        );

        if (result?.success) {
          console.log(`Created custom app for imported usage history: ${appInfo.name}`);
        } else if (result) {
          console.log(`Custom app already exists for usage history: ${appInfo.name}`);
        }
      }

      // Second pass: import usage history
      for (const item of [...settings.usageHistory].reverse()) {
        if (item && typeof item === "object" && item.profile && item.app && item.appName) {
          await safeAsyncOperation(
            () => addToUsageHistory(item.profile, item.app, item.appName),
            `Import usage history for ${item.profile} on ${item.appName}`,
            { showToastOnError: false }, // Don't show toast for individual items
          );
        }
      }
    }

    // Import app settings
    if (settings.visible && typeof settings.visible === "object") {
      const appSettings: AppSetting[] = [];

      for (const [appValue, visible] of Object.entries(settings.visible)) {
        if (typeof visible === "boolean") {
          appSettings.push({
            value: appValue,
            visible,
          });
        }
      }

      const settingsResult = await safeAsyncOperation(
        () => updateAppSettings(appSettings),
        "Update app visibility settings",
        { rethrow: true },
      );

      if (settingsResult === undefined) {
        throw new Error("Failed to update app visibility settings");
      }
    }

    // Import custom apps with duplicate checking
    if (settings.customApps && Array.isArray(settings.customApps)) {
      const importResults: {
        imported: number;
        skipped: number;
        failed: number;
        firstError?: string;
      } = {
        imported: 0,
        skipped: 0,
        failed: 0,
      };

      for (const app of settings.customApps) {
        if (app && typeof app === "object" && app.name && app.value && app.urlTemplate) {
          // Support both new 'visible' and legacy 'enabled' properties
          const appWithLegacy = app as typeof app & { enabled?: boolean };
          const customAppInput = {
            name: app.name.trim(),
            urlTemplate: app.urlTemplate.trim(),
            visible:
              typeof app.visible === "boolean"
                ? app.visible
                : typeof appWithLegacy.enabled === "boolean"
                  ? appWithLegacy.enabled
                  : true,
          };

          const result = await addCustomAppForImport(customAppInput);

          if (result?.success) {
            importResults.imported++;
            console.log(`Successfully imported custom app: ${app.name}`);
          } else if (result?.isDuplicate) {
            importResults.skipped++;
            console.log(`Skipped duplicate custom app: ${app.name} (already exists)`);
          } else {
            importResults.failed++;
            const errorMessage = result?.error || "Unknown error";
            console.error(`Failed to import custom app "${app.name}" (value: ${app.value}):`, errorMessage);
            // Store first error for user feedback
            if (importResults.failed === 1) {
              importResults.firstError = `Failed to import "${app.name}": ${errorMessage}`;
            }
          }
        }
      }

      console.log(
        `Import summary - Imported: ${importResults.imported}, Skipped: ${importResults.skipped}, Failed: ${importResults.failed}`,
      );

      // Show comprehensive import summary toast
      const totalApps = importResults.imported + importResults.skipped + importResults.failed;
      if (totalApps > 0) {
        let summaryMessage = `${importResults.imported} imported`;
        if (importResults.skipped > 0) {
          summaryMessage += `, ${importResults.skipped} skipped (duplicates)`;
        }
        if (importResults.failed > 0) {
          summaryMessage += `, ${importResults.failed} failed`;
        }

        const toastTitle = importResults.failed > 0 ? "Import Completed with Issues" : "Import Completed";
        if (importResults.failed > 0) {
          await showError(summaryMessage, toastTitle);
        } else {
          await showSuccess(toastTitle, summaryMessage);
        }

        // If there were failures, still throw an error but after showing the summary
        if (importResults.failed > 0 && importResults.firstError) {
          throw new Error(importResults.firstError);
        }
      }
    }
  } catch (error) {
    await handleError(error, "YAML Settings Import", true, "Import Failed");
    throw error;
  }
}

/**
 * Export settings to a YAML file in the user's home directory
 */
export async function exportSettingsToFile(filename?: string): Promise<string> {
  const yamlContent = await exportSettingsToYAML();
  const defaultFilename = `at-profile-settings-${new Date().toISOString().split("T")[0]}.yaml`;

  // Validate and sanitize filename if provided
  const fileName = filename ? validateAndSanitizeFilename(filename) : defaultFilename;
  const filePath = join(homedir(), fileName);

  // Validate that the path is secure
  validateSecurePath(filePath);

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
        if (finderItems.length > 0) {
          const selectedFile = finderItems[0].path;
          if (selectedFile.toLowerCase().endsWith(".yaml") || selectedFile.toLowerCase().endsWith(".yml")) {
            targetPath = selectedFile;
          }
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
