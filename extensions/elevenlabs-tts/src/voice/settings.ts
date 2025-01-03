import { VoiceSettings } from "./types";

/**
 * Prepares voice settings from user preferences
 * Converts string values to numbers and applies safety bounds
 *
 * @param preferences - User-configured preferences from Raycast
 * @returns Normalized voice settings
 */
export function prepareVoiceSettings(preferences: Preferences.SpeakSelected): VoiceSettings {
  return {
    stability: Math.min(1, Math.max(0, parseFloat(preferences.stability) || 0.5)),
    similarity_boost: Math.min(1, Math.max(0, parseFloat(preferences.similarityBoost) || 0.75)),
  };
}
