import { LocalStorage } from "@raycast/api";

const ENABLED_KEY = "enabled";

/**
 * Checks whether the extension is currently enabled.
 */
export async function getEnabled(): Promise<boolean> {
  const stored = await LocalStorage.getItem<boolean>(ENABLED_KEY);
  return stored ?? true;
}

/**
 * Persists the enabled state of the extension.
 */
export async function setEnabled(enabled: boolean): Promise<void> {
  await LocalStorage.setItem(ENABLED_KEY, enabled);
}
