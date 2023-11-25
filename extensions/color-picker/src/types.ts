import { LaunchProps } from "@raycast/api";

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

export type PickColorCommandLaunchProps = LaunchProps<{
  launchContext: {
    source?: "menu-bar" | "organize-colors";
  };
}>;
