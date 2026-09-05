import { Color } from "@raycast/api";
import type { StatusBadge } from "../types";

export const STATUS_COLORS: Record<StatusBadge, Color> = {
  CAUTION: Color.Red,
  PERSISTS: Color.Orange,
  SESSION: Color.Blue,
  RESTART: Color.Yellow,
  DEPRECATED: Color.SecondaryText,
  NEW: Color.Green,
};
