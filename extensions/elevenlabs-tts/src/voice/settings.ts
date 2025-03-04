import { VoiceSettings } from "./types";

/**
 * Validates and normalizes playback speed
 * Ensures speed is between 0.5 and 2.0, defaulting to 1.0 if invalid
 */
export function validatePlaybackSpeed(speed: string): string {
  const parsed = parseFloat(speed);
  if (isNaN(parsed)) return "1.00";
  const clamped = Math.min(2.0, Math.max(0.5, parsed));
  return clamped.toFixed(2);
}

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
