import { flavors, type FlavorName } from "@catppuccin/palette";
import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  flavor: keyof typeof flavors;
  gridSize: string;
}

export const getPreferences = (): Preferences => {
  return getPreferenceValues<Preferences>();
};

export const getFlavorPreference = (): FlavorName => {
  const preferences = getPreferences();
  return preferences.flavor || "mocha";
};

export const getGridSize = (): number => {
  const { gridSize } = getPreferences();
  const parsed = parseInt(gridSize, 10);
  return isNaN(parsed) || parsed <= 0 ? 8 : parsed;
};
