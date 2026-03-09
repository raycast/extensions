import { getPreferenceValues } from "@raycast/api";

export function useSettings() {
  const settings = getPreferenceValues<Preferences>();

  return {
    settings,
    isLoading: false,
  };
}
