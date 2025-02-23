import { getPreferenceValues } from "@raycast/api";
import { Preferences, TelegramConfig } from "./types";

export function getTelegramConfig(): TelegramConfig {
  try {
    const preferences = getPreferenceValues<Preferences>();
    
    if (!preferences.apiId) {
      throw new Error("API ID is not set in preferences");
    }
    if (!preferences.apiHash) {
      throw new Error("API Hash is not set in preferences");
    }

    const apiId = Number(preferences.apiId);
    if (isNaN(apiId)) {
      throw new Error("API ID must be a valid number");
    }

    console.log("Config loaded successfully:", { apiId });
    
    return {
      apiId,
      apiHash: preferences.apiHash,
    };
  } catch (error) {
    console.error("Failed to get configuration:", error);
    throw new Error(`Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}