import { getPreferenceValues } from "@raycast/api";

export interface Settings {
  downloadDirectory: string;
  defaultFormat: string;
  defaultResolution: string;
}

export function useSettings() {
  const settings = getPreferenceValues<Settings>();

  return {
    settings,
    isLoading: false,
  };
}
