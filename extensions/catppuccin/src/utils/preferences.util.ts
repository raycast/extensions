import { getPreferenceValues } from "@raycast/api";
import type { CatppuccinFlavor } from "@catppuccin/palette";
import { flavors } from "@catppuccin/palette";

export interface Preferences {
  flavor: keyof typeof flavors;
  gridSize: string;
}

export const getPreferences = (): Preferences => {
  return getPreferenceValues<Preferences>();
};

export const getFlavorPreference = (): CatppuccinFlavor => {
  const preferences = getPreferences();
  const flavorName = preferences.flavor || "mocha";
  return flavors[flavorName];
};

export const getGridSize = (): number => {
  const { gridSize } = getPreferences();
  const parsed = parseInt(gridSize, 10);
  return isNaN(parsed) || parsed <= 0 ? 8 : parsed;
};
