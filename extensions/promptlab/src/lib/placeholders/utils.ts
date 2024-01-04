import { Toast, environment, getPreferenceValues, showToast } from "@raycast/api";
import { defaultAdvancedSettings } from "../../data/default-advanced-settings";
import path from "path";
import { Placeholder, PLLoader } from "placeholders-toolkit";
import * as fs from "fs";
import { ExtensionPreferences } from "../../utils/types";
import { CUSTOM_PLACEHOLDERS_FILENAME } from "../../utils/constants";

/**
 * Loads custom placeholders from the custom-placeholders.json file in the support directory.
 * @param settings The advanced settings object.
 * @returns The custom placeholders as a {@link PlaceholderList} object.
 */
export const loadCustomPlaceholders = async (settings: typeof defaultAdvancedSettings) => {
  try {
    const preferences = getPreferenceValues<ExtensionPreferences>();
    const customPlaceholdersPath = path.join(environment.supportPath, CUSTOM_PLACEHOLDERS_FILENAME);
    const customPlaceholderFiles = [
      customPlaceholdersPath,
      ...(settings.placeholderSettings.allowCustomPlaceholderPaths
        ? preferences.customPlaceholderFiles.split(/, ?/g)
        : []),
    ].filter(
      (customPlaceholdersPath) => customPlaceholdersPath.trim().length > 0 && fs.existsSync(customPlaceholdersPath),
    );

    const customPlaceholders: Placeholder[] = [];
    for (const customPlaceholdersPath of customPlaceholderFiles) {
      try {
        const newPlaceholders = await PLLoader.loadPlaceholdersFromFile(customPlaceholdersPath);
        customPlaceholders.push(...newPlaceholders);
      } catch (e) {
        console.error(e);
        await showToast({
          title: "Error Loading Custom Placeholders",
          message: `Failed to load custom placeholders from ${customPlaceholdersPath}.`,
          style: Toast.Style.Failure,
        });
      }
    }
    return customPlaceholders;
  } catch (e) {
    console.error(e);
    return [];
  }
};
