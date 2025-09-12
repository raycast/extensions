import { launchCommand, LaunchProps } from "@raycast/api";

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

// The history color can also be an hex string
export type HistoryColor = Color | DeprecatedColor | string;

export type HistoryItem = {
  date: string;
  color: HistoryColor;
  title?: string;
};

export type LaunchOptions = Parameters<typeof launchCommand>[0];

export type PickColorCommandLaunchProps = LaunchProps<{
  launchContext: {
    source?: "menu-bar" | "organize-colors";
    copyToClipboard?: boolean;
    colorFormat?: string;
    callbackLaunchOptions?: LaunchOptions;
  };
}>;

export type SortType = "platform" | "proximity";

export type ColorFormatType =
  | "hex"
  | "hex-lower-case"
  | "hex-no-prefix"
  | "rgb"
  | "rgb-percentage"
  | "rgba"
  | "rgba-percentage"
  | "hsla"
  | "hsva"
  | "oklch"
  | "lch"
  | "p3";

export type UseColorsSelectionObject<T = HistoryItem | string> = {
  actions: {
    toggleSelection: (item: T) => void;
    selectAll: () => void;
    clearSelection: () => void;
  };
  selected: {
    selectedItems: T[];
    anySelected: boolean;
    allSelected: boolean;
    countSelected: number;
  };
  helpers: {
    getIsItemSelected: (item: T) => boolean;
  };
};

export type CopyColorsFormat = "json" | "css-classes" | "css-variables";
