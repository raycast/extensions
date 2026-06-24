import { LocalStorage, open } from "@raycast/api";

export const DIDA_SETTINGS_URL = "https://dida365.com/webapp#q/all/tasks?modalType=settings";
export const SETUP_OPENED_KEY = "dida365-settings-opened";

export class MissingApiTokenError extends Error {
  constructor() {
    super("Dida365 API Token is not configured. Run Setup API Token and paste the token in extension preferences.");
    this.name = "MissingApiTokenError";
  }
}

export async function openDidaSettingsOnce() {
  const opened = await LocalStorage.getItem<string>(SETUP_OPENED_KEY);

  if (opened) {
    return;
  }

  await LocalStorage.setItem(SETUP_OPENED_KEY, "true");
  await open(DIDA_SETTINGS_URL);
}

export function isMissingApiToken(error: unknown): boolean {
  return error instanceof MissingApiTokenError;
}
