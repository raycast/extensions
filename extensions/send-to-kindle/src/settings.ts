import { LocalStorage } from "@raycast/api";
import { EmailPreferences } from "./email";

export type SendMethod = "app" | "email";
export type SendPreferences = Partial<StoredSendSettings>;

export type StoredSendSettings = EmailPreferences & {
  sendMethod: SendMethod;
};

const SETTINGS_KEY = "send-to-kindle.settings.v1";

export async function getStoredSendSettings(): Promise<StoredSendSettings | undefined> {
  const raw = await LocalStorage.getItem<string>(SETTINGS_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as StoredSendSettings;
    if (parsed?.sendMethod !== "app" && parsed?.sendMethod !== "email") {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export async function setStoredSendSettings(settings: StoredSendSettings): Promise<void> {
  await LocalStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function resolveSendPreferences(): Promise<SendPreferences> {
  const storedSettings = await getStoredSendSettings();
  if (!storedSettings) {
    return {};
  }
  return storedSettings;
}

export function shouldShowSetupScreen(preferences: SendPreferences): boolean {
  return preferences.sendMethod !== "app" && preferences.sendMethod !== "email";
}
