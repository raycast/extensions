import { getPreferenceValues } from "@raycast/api";

export interface Prefs {
  closeOnAction: boolean;
}

export function getStoredPrefs(): Prefs {
  return getPreferenceValues();
}

export function shouldPopToRoot(): boolean {
  const prefs = getStoredPrefs();

  return prefs.closeOnAction;
}
