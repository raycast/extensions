import { LaunchProps } from "@raycast/api";

export type Color = {
  alpha: number;
  red: number; // between 0 and 1
  green: number; // between 0 and 1
  blue: number; // between 0 and 1
  colorSpace: string;
};

export type DeprecatedColor = {
  alpha: number;
  red: number; // between 0 and 255
  green: number; // between 0 and 255
  blue: number; // between 0 and 255
};

export type HistoryItem = {
  date: string;
  color: Color | DeprecatedColor;
  title?: string;
};

export type PickColorCommandLaunchProps = LaunchProps<{
  launchContext: {
    source?: "menu-bar" | "organize-colors";
  };
}>;
