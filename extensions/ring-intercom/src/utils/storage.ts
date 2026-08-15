import { LocalStorage } from "@raycast/api";
import { randomBytes } from "crypto";

export const STORAGE_KEYS = {
  HARDWARE_ID: "RING_HARDWARE_ID",
  EMAIL: "RING_EMAIL",
  PASSWORD: "RING_PASSWORD",
  REFRESH_TOKEN: "RING_REFRESH_TOKEN",
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

export async function getSavedCredentials(): Promise<{ email?: string; password?: string }> {
  const [email, password] = await Promise.all([
    LocalStorage.getItem<string>(STORAGE_KEYS.EMAIL),
    LocalStorage.getItem<string>(STORAGE_KEYS.PASSWORD),
  ]);
  return {
    email: email ?? undefined,
    password: password ?? undefined,
  };
}

export async function saveCredentials(email: string, password: string): Promise<void> {
  await Promise.all([
    LocalStorage.setItem(STORAGE_KEYS.EMAIL, email),
    LocalStorage.setItem(STORAGE_KEYS.PASSWORD, password),
  ]);
}
