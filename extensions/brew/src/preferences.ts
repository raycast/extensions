import { getPreferenceValues } from "@raycast/api";

export const preferences: {
  greedyUpgrades: boolean;
  customBrewPath?: string;
  terminalApp: "terminal" | "iterm";
} = getPreferenceValues();
