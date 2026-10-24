import { Color, Icon } from "@raycast/api";
import { Appearance } from "../types/types";

export const APPEARANCE_ICONS: Record<Appearance, { source: Icon; tintColor: Color }> = {
  [Appearance.Dark]: { source: Icon.Moon, tintColor: Color.Purple },
  [Appearance.Light]: { source: Icon.Sun, tintColor: Color.Yellow },
  [Appearance.Auto]: { source: Icon.CircleProgress50, tintColor: Color.Blue },
};
