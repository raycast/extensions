import { LocalStorage } from "@raycast/api";
import { WLEDDevice } from "./wled-api";

const STORAGE_KEY = "wled-devices";
const LAST_COLOR_KEY = "wled-last-custom-color";

export interface CustomColor {
  red: number;
  green: number;
  blue: number;
  hex: string;
}

/**
 * Load devices from LocalStorage
 */
export async function loadDevices(): Promise<WLEDDevice[]> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error("Failed to load devices:", error);
  }
  return [];
}

/**
 * Save devices to LocalStorage
 */
export async function saveDevices(devices: WLEDDevice[]): Promise<void> {
  try {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
  } catch (error) {
    console.error("Failed to save devices:", error);
    throw error;
  }
}

/**
 * Load last custom color from LocalStorage
 */
export async function loadLastCustomColor(): Promise<CustomColor | null> {
  try {
    const stored = await LocalStorage.getItem<string>(LAST_COLOR_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load last custom color:", error);
  }
  return null;
}

/**
 * Save last custom color to LocalStorage
 */
export async function saveLastCustomColor(color: CustomColor): Promise<void> {
  try {
    await LocalStorage.setItem(LAST_COLOR_KEY, JSON.stringify(color));
  } catch (error) {
    console.error("Failed to save last custom color:", error);
  }
}
