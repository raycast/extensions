import { Color, Icon } from "@raycast/api";
import { join } from "path";
import { homedir } from "os";
import type {
  BookmarkFolder,
  ColorOption,
  FolderColorOption,
  FolderIconOption,
  GridSizeOption,
  QuickActionPreference,
} from "./types";

export const BOOKMARKS_KEY = "hugeicons-bookmarks";
export const COLOR_KEY = "hugeicons-color";
export const GRID_SIZE_KEY = "hugeicons-grid-size";
export const QUICK_ACTION_KEY = "hugeicons-quick-action";
export const LAST_FOLDER_KEY = "hugeicons-last-folder";
export const PREVIEW_STYLE_KEY = "hugeicons-preview-style";
export const RECENT_SEARCHES_KEY = "hugeicons-recent-searches";
export const DOWNLOADS_PATH = join(homedir(), "Downloads");
export const PNG_EXPORT_SUPPORTED = process.platform === "darwin";
export const ICON_STYLES = [
  "stroke-standard",
  "solid-standard",
  "duotone-standard",
  "stroke-rounded",
  "solid-rounded",
  "duotone-rounded",
  "twotone-rounded",
  "bulk-rounded",
  "stroke-sharp",
  "solid-sharp",
] as const;
export const ICON_STYLE_GROUPS = {
  Standard: ["stroke-standard", "solid-standard", "duotone-standard"],
  Rounded: ["stroke-rounded", "solid-rounded", "duotone-rounded", "twotone-rounded", "bulk-rounded"],
  Sharp: ["stroke-sharp", "solid-sharp"],
} as const satisfies Record<string, readonly (typeof ICON_STYLES)[number][]>;

export const COLOR_OPTIONS: ColorOption[] = [
  { name: "Auto", value: "auto", raycastColor: Color.PrimaryText },
  { name: "White", value: "#FFFFFF", raycastColor: Color.PrimaryText },
  { name: "Black", value: "#000000", raycastColor: Color.SecondaryText },
  { name: "Red", value: "#FF3B30", raycastColor: Color.Red },
  { name: "Orange", value: "#FF9500", raycastColor: Color.Orange },
  { name: "Yellow", value: "#FFCC00", raycastColor: Color.Yellow },
  { name: "Green", value: "#34C759", raycastColor: Color.Green },
  { name: "Blue", value: "#007AFF", raycastColor: Color.Blue },
  { name: "Purple", value: "#AF52DE", raycastColor: Color.Purple },
  { name: "Magenta", value: "#FF2D55", raycastColor: Color.Magenta },
];

export const GRID_SIZE_OPTIONS: GridSizeOption[] = [
  { name: "Large (3 columns)", value: "3" },
  { name: "Medium (5 columns)", value: "5" },
  { name: "Small (8 columns)", value: "8" },
];

export const QUICK_ACTION_OPTIONS: Array<{ name: string; value: QuickActionPreference }> = [
  { name: "View All Styles", value: "view-styles" },
  { name: "Copy SVG", value: "copy-svg" },
  { name: "Copy React (JSX)", value: "copy-jsx" },
  { name: "Download SVG", value: "download-svg" },
];

export const FOLDER_COLOR_OPTIONS: FolderColorOption[] = [
  { name: "Red", value: "Red", raycastColor: Color.Red },
  { name: "Orange", value: "Orange", raycastColor: Color.Orange },
  { name: "Yellow", value: "Yellow", raycastColor: Color.Yellow },
  { name: "Green", value: "Green", raycastColor: Color.Green },
  { name: "Blue", value: "Blue", raycastColor: Color.Blue },
  { name: "Purple", value: "Purple", raycastColor: Color.Purple },
  { name: "Magenta", value: "Magenta", raycastColor: Color.Magenta },
];

export const FOLDER_ICON_OPTIONS: FolderIconOption[] = [
  { name: "Folder", value: "Folder", icon: Icon.Folder },
  { name: "Star", value: "Star", icon: Icon.Star },
  { name: "Heart", value: "Heart", icon: Icon.Heart },
  { name: "Bookmark", value: "Bookmark", icon: Icon.Bookmark },
  { name: "Tag", value: "Tag", icon: Icon.Tag },
  { name: "Box", value: "Box", icon: Icon.Box },
  { name: "Document", value: "Document", icon: Icon.Document },
  { name: "Code", value: "Code", icon: Icon.Code },
  { name: "Globe", value: "Globe", icon: Icon.Globe },
  { name: "Person", value: "Person", icon: Icon.Person },
  { name: "Building", value: "Building", icon: Icon.Building },
  { name: "Cart", value: "Cart", icon: Icon.Cart },
  { name: "Game", value: "GameController", icon: Icon.GameController },
  { name: "Music", value: "Music", icon: Icon.Music },
  { name: "Video", value: "Video", icon: Icon.Video },
  { name: "Camera", value: "Camera", icon: Icon.Camera },
  { name: "Brush", value: "Brush", icon: Icon.Brush },
  { name: "Hammer", value: "Hammer", icon: Icon.Hammer },
  { name: "Gear", value: "Gear", icon: Icon.Gear },
  { name: "Lightning", value: "LightBulb", icon: Icon.LightBulb },
];

export const FOLDER_COLORS = Object.fromEntries(
  FOLDER_COLOR_OPTIONS.map((option) => [option.value, option.raycastColor]),
) as Record<string, Color>;

export const FOLDER_ICONS = Object.fromEntries(
  FOLDER_ICON_OPTIONS.map((option) => [option.value, option.icon]),
) as Record<string, Icon>;

export const DEFAULT_FOLDER: BookmarkFolder = {
  id: "favorites",
  name: "Favorites",
  color: "Yellow",
  icon: "Star",
  icons: [],
};

export function getColorName(value: string): string {
  return COLOR_OPTIONS.find((option) => option.value === value)?.name ?? value;
}

export function getQuickActionName(value: string | undefined): string {
  return QUICK_ACTION_OPTIONS.find((option) => option.value === value)?.name ?? "View All Styles";
}

export function isQuickActionPreferenceValue(value: string | undefined): value is QuickActionPreference {
  return QUICK_ACTION_OPTIONS.some((option) => option.value === value);
}

export function getFolderColor(colorName?: string): Color {
  if (!colorName) {
    return Color.Yellow;
  }

  return FOLDER_COLORS[colorName] ?? Color.Yellow;
}

export function getFolderIcon(iconName?: string): Icon {
  if (!iconName) {
    return Icon.Folder;
  }

  return FOLDER_ICONS[iconName] ?? Icon.Folder;
}
