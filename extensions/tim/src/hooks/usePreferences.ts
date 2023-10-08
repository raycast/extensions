import { getPreferenceValues } from "@raycast/api";

export type TimeFormat = "compact" | "compact-short" | "human" | "human-short" | "float" | "float-short";

type Preferences = {
  currency: string;
  timeFormat: TimeFormat;
};

export function usePreferences() {
  return getPreferenceValues<Preferences>();
}
