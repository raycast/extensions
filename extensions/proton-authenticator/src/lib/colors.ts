import { environment, Icon } from "@raycast/api";

import { COLORS } from "./constants";

export function getProgressColor(remainingTime: number): { main: string; background: string } {
  if (remainingTime >= 10) return COLORS[environment.appearance][`purple`];
  if (remainingTime > 5) return COLORS[environment.appearance][`orange`];
  return COLORS[environment.appearance][`red`];
}

// Built-in icons, since the new Raycast app doesn't render the SVG data URI from @raycast/utils' getProgressIcon
export function getProgressIcon(progress: number): Icon {
  if (progress > 0.875) return Icon.CircleProgress100;
  if (progress > 0.625) return Icon.CircleProgress75;
  if (progress > 0.375) return Icon.CircleProgress50;
  if (progress > 0.125) return Icon.CircleProgress25;
  return Icon.Circle;
}
