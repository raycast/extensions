import { getPreferenceValues } from "@raycast/api";

export interface BeszelPreferences {
  host: string;
  token: string;
  formatterLocale?: string;
  defaultInterval: string;
  observationInterval: string;
  observationIntervalsCount: number;
}

export function usePreferences(): Required<BeszelPreferences> {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  return {
    ...prefs,
    observationIntervalsCount: Number.parseInt(prefs.observationIntervalsCount || "5", 10),
  };
}
