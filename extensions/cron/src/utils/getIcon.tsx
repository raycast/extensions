import { getAvatarIcon } from "@raycast/utils";
import { iconsType as defaultIconsType } from "u/options";
import { ICONS } from "u/constants";
import SVG from "u/getSvg";
import SVGName from "u/getSvgName";

interface IconProps {
  iconsType?: string;
  iconDay?: number;
  iconEvents?: boolean;
  iconToday?: boolean;
  iconWeekend?: boolean;
  iconName?: string;
}

export const getIcon = ({
  iconsType = defaultIconsType,
  iconDay = 0,
  iconEvents = false,
  iconToday = false,
  iconWeekend = false,
  iconName,
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
      if (iconName) {
        source = SVGName({
          day: iconDay,
          isToday: iconToday,
          hasEvents: iconEvents,
          isWeekend: iconWeekend,
          weekDay: iconName,
        });
      } else {
        source = SVG({
          day: iconDay,
          isToday: iconToday,
          hasEvents: iconEvents,
          isWeekend: iconWeekend,
          weekDay: iconName,
        });
      }
      break;
    default:
      source = getAvatarIcon(iconDaySpaced, { background: "none", gradient: false });
  }
  return source;
};
