import { LocalStorage } from "@raycast/api";

const KEY = "mac-updater-onboarded-v1";

export async function isOnboarded(): Promise<boolean> {
  return (await LocalStorage.getItem<string>(KEY)) === "true";
}

export async function markOnboarded(): Promise<void> {
  await LocalStorage.setItem(KEY, "true");
}

export async function resetOnboarding(): Promise<void> {
  await LocalStorage.removeItem(KEY);
}
