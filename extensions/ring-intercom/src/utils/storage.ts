import { LocalStorage } from "@raycast/api";
import { randomBytes } from "crypto";

export const STORAGE_KEYS = {
  HARDWARE_ID: "RING_HARDWARE_ID",
  EMAIL: "RING_EMAIL",
  // Earlier versions saved the password here. It is no longer saved, and Authenticate removes it.
  PASSWORD: "RING_PASSWORD",
  REFRESH_TOKEN: "RING_REFRESH_TOKEN",
  DEFAULT_INTERCOM_ID: "RING_DEFAULT_INTERCOM_ID",
} as const;

export async function getOrCreateHardwareId(): Promise<string> {
  const storedId = await LocalStorage.getItem<string>(STORAGE_KEYS.HARDWARE_ID);
  if (storedId) {
    return storedId;
  }
  const newId = randomBytes(16).toString("hex");
  await LocalStorage.setItem(STORAGE_KEYS.HARDWARE_ID, newId);
  return newId;
}

export async function getSavedEmail(): Promise<string | undefined> {
  return (await LocalStorage.getItem<string>(STORAGE_KEYS.EMAIL)) ?? undefined;
}

export async function saveEmail(email: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.EMAIL, email);
}

export async function removeSavedPassword(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.PASSWORD);
}

// Ring's device IDs are numbers. Compare and store them as strings.
export async function getDefaultIntercomId(): Promise<string | undefined> {
  const id = await LocalStorage.getItem<string | number>(STORAGE_KEYS.DEFAULT_INTERCOM_ID);
  return id === undefined ? undefined : String(id);
}

export async function setDefaultIntercomId(id: string): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.DEFAULT_INTERCOM_ID, id);
}
