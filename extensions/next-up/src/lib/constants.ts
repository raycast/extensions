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
];

// Derive COLOR_OPTIONS from COLOR_DEFINITIONS so they stay in sync
export const COLOR_OPTIONS = [
  ...COLOR_DEFINITIONS.map((c) => ({ label: c.label, value: c.value })),
  { label: "Custom...", value: CUSTOM_COLOR_VALUE },
];

export const ICON_OPTIONS = [
  { label: "Book", value: "book" },
  { label: "Bolt (Energy)", value: "bolt" },
  { label: "Building", value: "building" },
  { label: "Calculator", value: "calculator" },
  { label: "Calendar", value: "calendar" },
  { label: "Camera", value: "camera" },
  { label: "Clipboard", value: "clipboard" },
  { label: "Code", value: "code" },
  { label: "Desktop", value: "desktop" },
  { label: "Envelope", value: "envelope" },
  { label: "Gear", value: "gear" },
  { label: "Globe", value: "globe" },
  { label: "Hammer", value: "hammer" },
  { label: "Heart", value: "heart" },
  { label: "Layers", value: "layers" },
  { label: "Lightbulb", value: "lightbulb" },
  { label: "Magnifying Glass", value: "magnifyingglass" },
  { label: "Music", value: "music" },
  { label: "Pencil", value: "pencil" },
  { label: "Person", value: "person" },
  { label: "Pin", value: "pin" },
  { label: "Speaker", value: "speaker" },
  { label: "Star", value: "star" },
  { label: "Tag", value: "tag" },
  { label: "Terminal", value: "terminal" },
  { label: "Trophy", value: "trophy" },
  { label: "Video", value: "video" },
];

export const STORAGE_KEY = "next_up_data";
export const TEMPLATES_KEY = "next_up_templates";
export const MAX_SCHEDULE_SLOTS = 3;

export const ICON_MAP: Record<string, Icon> = Object.fromEntries(
  ICON_OPTIONS.map((opt) => [opt.value, Icon[opt.value as keyof typeof Icon]]),
);

export function getIcon(iconName: string | undefined): Icon | undefined {
  if (!iconName) return undefined;
  return ICON_MAP[iconName.toLowerCase()];
}
