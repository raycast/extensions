import { useLocalStorage } from "@raycast/utils";
import { STORAGE_KEYS } from "../constants";

interface UserSettings {
  showWelcomeMessage: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  showWelcomeMessage: true,
};

export function useSettings() {
  const { value: settings, isLoading } = useLocalStorage<UserSettings>(STORAGE_KEYS.USER_SETTINGS, DEFAULT_SETTINGS);

  return {
    settings: settings ?? DEFAULT_SETTINGS,
    isLoading,
  };
}
