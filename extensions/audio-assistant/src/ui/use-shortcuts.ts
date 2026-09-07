import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useSyncExternalStore } from "react";
import { ShortcutSettings, toPreferences } from "../services/shortcut-settings";
import { getShortcuts } from "./shortcuts";

export const shortcutSettings = new ShortcutSettings(
  {
    getItem: (key) => LocalStorage.getItem<string>(key),
    setItem: (key, value) => LocalStorage.setItem(key, value),
  },
  () => getPreferenceValues(),
);

export function useShortcutSettings() {
  const state = useSyncExternalStore(shortcutSettings.subscribe, shortcutSettings.getSnapshot);
  useEffect(() => {
    void shortcutSettings.initialize();
  }, []);
  return state;
}
export function useShortcuts() {
  const { config } = useShortcutSettings();
  return getShortcuts(toPreferences(config));
}
