import { getPreferenceValues } from "@raycast/api";

export const preferences: {
  customBrewPath?: string;
  terminalApp: "terminal" | "iterm";
  greedyUpgrades: boolean;
  zapCask: boolean;
} = getPreferenceValues();
