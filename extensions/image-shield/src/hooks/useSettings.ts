import { useLocalStorage } from "@raycast/utils";
import { SETTINGS_KEY } from "../constraints";
import { initialSettings, SettingsFromValues } from "../components/SettingsFrom";

export function useSettings() {
  const {
    value: settings,
    setValue: setSettings,
    removeValue: reset,
    isLoading,
  } = useLocalStorage<SettingsFromValues>(SETTINGS_KEY, initialSettings);

  return {
    settings,
    setSettings,
    reset,
    isLoading,
  };
}
