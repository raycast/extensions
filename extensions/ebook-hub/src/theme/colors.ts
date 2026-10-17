import type { Color } from "@raycast/api";

import { HUE_MOODS, type HueRole, type MoodId } from "./hue-tokens";

/**
 * Theme-aware accent: Huế Cung on light Raycast themes, the selected dark mood
 * on dark themes (Huế Mưa when Huế Cung itself is selected).
 */
export function hueColor(mood: MoodId, role: HueRole): Color.Dynamic {
  const selected = HUE_MOODS[mood];
  const dark = selected.appearance === "dark" ? selected : HUE_MOODS.mua;
  return { light: HUE_MOODS.cung.roles[role], dark: dark.roles[role], adjustContrast: true };
}
