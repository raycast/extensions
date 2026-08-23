import { Color, Icon } from "@raycast/api";
import { DayOfWeek } from "./types";

export const DAYS_OF_WEEK: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const CUSTOM_COLOR_VALUE = "custom";

export interface ColorDefinition {
  label: string;
  value: string; // stored identifier
  hex: string; // for display
  raycast: Color; // for Raycast-native components
}

export const COLOR_DEFINITIONS: ColorDefinition[] = [
  { label: "Red", value: "red", hex: "#FF4444", raycast: Color.Red },
  { label: "Orange", value: "orange", hex: "#FF8800", raycast: Color.Orange },
  { label: "Yellow", value: "yellow", hex: "#FFCC00", raycast: Color.Yellow },
  { label: "Green", value: "green", hex: "#44CC44", raycast: Color.Green },
  { label: "Blue", value: "blue", hex: "#4488FF", raycast: Color.Blue },
  { label: "Purple", value: "purple", hex: "#AA44FF", raycast: Color.Purple },
  { label: "Pink", value: "pink", hex: "#FF44AA", raycast: Color.Magenta },
  { label: "Brown", value: "brown", hex: "#8B4513", raycast: Color.SecondaryText },
];

// Derive COLOR_OPTIONS from COLOR_DEFINITIONS so they stay in sync
export const COLOR_OPTIONS = [
  ...COLOR_DEFINITIONS.map((c) => ({ label: c.label, value: c.value })),
  { label: "Custom...", value: CUSTOM_COLOR_VALUE },
];

export const ICON_OPTIONS = [
  { label: "Book", value: "Book" },
  { label: "Bolt (Energy)", value: "Bolt" },
  { label: "Building", value: "Building" },
  { label: "Calculator", value: "Calculator" },
  { label: "Calendar", value: "Calendar" },
  { label: "Camera", value: "Camera" },
  { label: "Clipboard", value: "Clipboard" },
  { label: "Code", value: "Code" },
  { label: "Desktop", value: "Desktop" },
  { label: "Envelope", value: "Envelope" },
  { label: "Gear", value: "Gear" },
  { label: "Globe", value: "Globe" },
  { label: "Hammer", value: "Hammer" },
  { label: "Heart", value: "Heart" },
  { label: "Layers", value: "Layers" },
  { label: "Lightbulb", value: "Lightbulb" },
  { label: "Magnifying Glass", value: "MagnifyingGlass" },
  { label: "Music", value: "Music" },
  { label: "Pencil", value: "Pencil" },
  { label: "Person", value: "Person" },
  { label: "Pin", value: "Pin" },
  { label: "Speaker", value: "Speaker" },
  { label: "Star", value: "Star" },
  { label: "Tag", value: "Tag" },
  { label: "Terminal", value: "Terminal" },
  { label: "Trophy", value: "Trophy" },
  { label: "Video", value: "Video" },
];

export const STORAGE_KEY = "next_up_data";
export const TEMPLATES_KEY = "next_up_templates";
export const MAX_SCHEDULE_SLOTS = 3;

export const ICON_MAP: Record<string, Icon> = Object.fromEntries(
  ICON_OPTIONS.map((opt) => [opt.value.toLowerCase(), Icon[opt.value as keyof typeof Icon]]),
);

export function getIcon(iconName: string | undefined): Icon | undefined {
  if (!iconName) return undefined;
  // Support both old lowercase values and new proper-case values
  return ICON_MAP[iconName.toLowerCase()];
}
