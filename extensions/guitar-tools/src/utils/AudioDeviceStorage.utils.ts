import { LocalStorage } from "@raycast/api";

const AUDIO_DEVICE_KEY = "selectedAudioDevice";

/**
 * Save the selected audio device to local storage
 */
export async function saveSelectedDevice(deviceName: string): Promise<void> {
  await LocalStorage.setItem(AUDIO_DEVICE_KEY, deviceName);
}

/**
 * Get the selected audio device from local storage
 * Returns empty string if no device is selected
 */
export async function getSelectedDevice(): Promise<string> {
  const device = await LocalStorage.getItem<string>(AUDIO_DEVICE_KEY);
  return device || "";
}
