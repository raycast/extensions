import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  weekStart: string;
  icon: string;
  prefix: string;
  suffix: string;
  weekNumberText: boolean;
}

export const { weekStart, icon, prefix, suffix, weekNumberText } = getPreferenceValues<Preferences>();
