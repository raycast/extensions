import { useLocalStorage } from "@raycast/utils";

interface UserSettings {
  showWelcomeMessage: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  showWelcomeMessage: true,
};

export function useSettings() {
  const { value: settings, isLoading } = useLocalStorage<UserSettings>("user-settings", DEFAULT_SETTINGS);

  return {
    settings: settings ?? DEFAULT_SETTINGS,
    isLoading,
  };
}
