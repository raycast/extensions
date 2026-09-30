import { Color } from "@raycast/api";
import { Appearance } from "../types/types";

export const APPEARANCE_TAG_COLORS: Record<Appearance, Color> = {
  [Appearance.Dark]: Color.Purple,
  [Appearance.Light]: Color.Yellow,
  [Appearance.Auto]: Color.Blue,
};
