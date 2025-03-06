import { LocalStorage } from "@raycast/api";
import { OTPConfig } from "../types";

const STORAGE_KEY = "otp-configs";

/**
 * Saves OTP configurations to local storage
 */
export async function saveOTPConfigs(configs: OTPConfig[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

/**
 * Loads OTP configurations from local storage
 */
export async function loadOTPConfigs(): Promise<OTPConfig[]> {
  const data = await LocalStorage.getItem(STORAGE_KEY);

  if (!data) {
    return [];
  }

  try {
    return JSON.parse(data as string) as OTPConfig[];
  } catch (error) {
    console.error("Error loading OTP configurations:", error);
    return [];
  }
}

/**
 * Adds an OTP configuration to local storage
 */
export async function addOTPConfig(config: OTPConfig): Promise<void> {
  const configs = await loadOTPConfigs();
  configs.push(config);
  await saveOTPConfigs(configs);
}

/**
 * Removes an OTP configuration from local storage
 */
export async function removeOTPConfig(id: string): Promise<void> {
  const configs = await loadOTPConfigs();
  const updatedConfigs = configs.filter((config) => config.id !== id);
  await saveOTPConfigs(updatedConfigs);
}
