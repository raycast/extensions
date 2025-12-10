import { LocalStorage, getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export const LAST_VOLUME_KEY = "lastInputVolume";
export const DEFAULT_FALLBACK_VOLUME = 70;

export interface Preferences {
  fallbackUnmutedVolume?: string;
}

/**
 * Get the current microphone input volume (0-100)
 */
export async function getCurrentInputVolume(): Promise<number> {
  const result = await runAppleScript("return input volume of (get volume settings)");
  return parseInt(result, 10);
}

/**
 * Set the microphone input volume (0-100)
 */
export async function setInputVolume(volume: number): Promise<void> {
  const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)));
  await runAppleScript(`set volume input volume ${clampedVolume}`);
}

/**
 * Get the fallback volume from preferences or use default
 */
export function getFallbackVolume(): number {
  const preferences = getPreferenceValues<Preferences>();
  const prefValue = preferences.fallbackUnmutedVolume;
  if (prefValue) {
    const parsed = parseInt(prefValue, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      return parsed;
    }
  }
  return DEFAULT_FALLBACK_VOLUME;
}

/**
 * Toggle the microphone mute state
 * Returns the new volume level
 */
export async function toggleMicrophone(): Promise<number> {
  const currentVolume = await getCurrentInputVolume();

  if (currentVolume === 0) {
    // Unmute: restore last volume or use fallback
    const storedVolume = await LocalStorage.getItem<string>(LAST_VOLUME_KEY);
    let targetVolume = getFallbackVolume();

    if (storedVolume) {
      const parsed = parseInt(storedVolume, 10);
      if (!isNaN(parsed) && parsed > 0) {
        targetVolume = parsed;
      }
    }

    await setInputVolume(targetVolume);
    await showHUD(`🎙️ Microphone unmuted (${targetVolume}%)`);
    return targetVolume;
  } else {
    // Mute: save current volume and set to 0
    await LocalStorage.setItem(LAST_VOLUME_KEY, currentVolume.toString());
    await setInputVolume(0);
    await showHUD("🔇 Microphone muted");
    return 0;
  }
}
