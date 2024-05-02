import { getAvatarIcon } from "@raycast/utils";
import { iconsType as defaultIconsType } from "u/options";
import { ICONS } from "u/constants";
import SVG from "u/getSvg";

interface IconProps {
  iconsType?: string;
  iconDay?: number;
  iconEvents?: boolean;
  iconToday?: boolean;
  iconWeekend?: boolean;
}

export const getIcon = ({
  iconsType = defaultIconsType,
  iconDay = 0,
  iconEvents = false,
  iconToday = false,
  iconWeekend = false,
}: IconProps) => {
  const iconDaySpaced = iconDay.toString().split("").join(" ");

  let source;
  switch (iconsType) {
    case "avatar":
      source = getAvatarIcon(iconDaySpaced, { background: "none", gradient: false });
      break;
    case "raycast":
      source = ICONS[iconDay.toString() as keyof typeof ICONS];
      break;
    case "glyph":
      source = SVG({ day: iconDay, isToday: iconToday, hasEvents: iconEvents, isWeekend: iconWeekend });
      break;
    default:
      source = getAvatarIcon(iconDaySpaced, { background: "none", gradient: false });
  }
  return source;
};
