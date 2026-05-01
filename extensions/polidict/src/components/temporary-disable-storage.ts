import { LocalStorage } from "@raycast/api";
import { normalizeTemporaryDisableState, type TemporaryDisableState } from "./temporary-disable";

const STORAGE_KEY_PREFIX = "training-temp-disable:v1:";

function getStorageKey(languageCode: string): string {
  return `${STORAGE_KEY_PREFIX}${languageCode}`;
}

export async function loadTemporaryDisableState(languageCode: string): Promise<TemporaryDisableState> {
  try {
    const value = await LocalStorage.getItem<string>(getStorageKey(languageCode));
    if (!value) return {};
    return normalizeTemporaryDisableState(JSON.parse(value));
  } catch {
    return {};
  }
}

export async function saveTemporaryDisableState(languageCode: string, state: TemporaryDisableState): Promise<void> {
  try {
    if (Object.keys(state).length === 0) {
      await LocalStorage.removeItem(getStorageKey(languageCode));
      return;
    }

    await LocalStorage.setItem(getStorageKey(languageCode), JSON.stringify(state));
  } catch {
    // Best-effort persistence only
  }
}
