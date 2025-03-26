import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  MaxRecent: number;
  MaxPins: number;
  IconPinColored: boolean;
  ShowTypeIcon: boolean;
}

const preferences = getPreferenceValues<Preferences>();

export const maxRecent = Number(preferences.MaxRecent);
export const maxPins = Number(preferences.MaxPins);
export const isPinColored = preferences.IconPinColored;
export const showTypeIcon = preferences.ShowTypeIcon;
