import { getPreferenceValues } from "@raycast/api";

export const preferences: {
  greedyUpgrades: boolean;
  customBrewPath?: string;
  useIterm2: boolean;
} = getPreferenceValues();
