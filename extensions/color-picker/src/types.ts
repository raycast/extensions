import { LaunchType } from "@raycast/api";

export type Color = {
  alpha: number;
  red: number;
  green: number;
  blue: number;
};

export type HistoryItem = {
  date: string;
  color: Color;
};

export type OrganizeColorsCommandPreferences = {
  primaryAction: "copy" | "paste";
};

export type ExtensionPreferences = {
  colorFormat: "hex" | "hex-lower-case" | "rgba" | "rgba-percentage" | "hsla";
};

export type PickColorCommandLaunchProps = {
  launchType: LaunchType;
  launchContext: {
    source?: "menu-bar" | "organize-colors";
  };
};
