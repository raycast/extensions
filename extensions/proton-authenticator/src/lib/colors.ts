import { environment } from "@raycast/api";

import { COLORS } from "./constants";

export function getProgressColor(remainingTime: number): { main: string; background: string } {
  if (remainingTime >= 10) return COLORS[environment.appearance][`purple`];
  if (remainingTime > 5) return COLORS[environment.appearance][`orange`];
  return COLORS[environment.appearance][`red`];
}
