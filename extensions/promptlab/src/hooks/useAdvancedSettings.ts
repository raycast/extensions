import { useEffect, useState } from "react";
import { defaultAdvancedSettings } from "../data/default-advanced-settings";
import * as fs from "fs";
import { environment, showToast } from "@raycast/api";
import { ADVANCED_SETTINGS_FILENAME } from "../lib/common/constants";
import path from "path";

/**
 * Hook for managing advanced settings.
 * @returns
 */
export const useAdvancedSettings = () => {
  const [advancedSettings, setAdvancedSettings] = useState(defaultAdvancedSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const advancedSettingsPath = path.join(environment.supportPath, ADVANCED_SETTINGS_FILENAME);

  /**
   * Creates the advanced settings file.
   */
  const createAdvancedSettings = async () => {
    try {
      await fs.promises.writeFile(advancedSettingsPath, JSON.stringify(defaultAdvancedSettings, null, 2));
    } catch {
      await showToast({ title: "Error", message: "Could not create advanced settings file." });
    }
  };

  /**
   * Loads settings from the advanced settings file.
   */
  const loadAdvancedSettings = async () => {
    if (!fs.existsSync(advancedSettingsPath)) {
      await createAdvancedSettings();
    }

    try {
      const advancedSettingsValues = JSON.parse(fs.readFileSync(advancedSettingsPath, "utf-8"));
      setAdvancedSettings(advancedSettingsValues);
    } catch {
      await showToast({ title: "Error", message: "Could not load advanced settings file." });
    }
  };

  /**
   * Reloads the advanced settings.
   */
  const revalidateAdvancedSettings = async () => {
    setIsLoading(true);
    await loadAdvancedSettings();
    setIsLoading(false);
  };

  useEffect(() => {
    revalidateAdvancedSettings();
  }, []);

  return {
    /**
     * The advanced settings object.
     */
    advancedSettings,

    /**
     * Reloads the advanced settings.
     */
    revalidateAdvancedSettings,

    /**
     * Whether the advanced settings are loading.
     */
    loadingAdvancedSettings: isLoading,
  };
};
