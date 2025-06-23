import { useLocalStorage } from "@raycast/utils";
import { SETTINGS_KEY } from "../constraints";
import { initialSettings, SettingsFormValues } from "../components/SettingsForm";

export function useSettings() {
  const {
    value: settings,
    setValue: setSettings,
    removeValue: reset,
    isLoading,
  } = useLocalStorage<SettingsFormValues>(SETTINGS_KEY, initialSettings);

  return {
    settings,
    setSettings,
    reset,
    isLoading,
  };
}
