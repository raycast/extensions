import { Color } from "@raycast/api";

/**
 * Centralized constants for Vesslo Raycast Extension
 */

// Source badge colors
export const SOURCE_COLORS: Record<string, Color> = {
  Brew: Color.Orange,
  "App Store": Color.Blue,
  Sparkle: Color.Green,
  Manual: Color.SecondaryText,
} as const;

// Sort option labels
export const SORT_LABELS = {
  source: "By Source",
  name: "By Name (A-Z)",
  nameDesc: "By Name (Z-A)",
  developer: "By Developer",
} as const;

export type SortOption = keyof typeof SORT_LABELS;

// Source badge helper
export function getSourceColor(source: string): Color {
  return SOURCE_COLORS[source] ?? Color.SecondaryText;
}
