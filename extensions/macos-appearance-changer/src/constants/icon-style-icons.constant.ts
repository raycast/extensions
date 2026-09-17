import { Image } from "@raycast/api";
import { IconStyle } from "../types/types";

export const ICON_STYLE_ICONS: Record<IconStyle, Image> = {
  [IconStyle.Default]: { source: "icon-style-default.png" },
  [IconStyle.Dark]: { source: "icon-style-dark.png" },
  [IconStyle.Clear]: { source: "icon-style-clear.png" },
  [IconStyle.Tinted]: { source: "icon-style-tinted.png" },
};
