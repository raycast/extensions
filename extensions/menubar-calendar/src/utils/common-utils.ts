import {
  highlightCalendar,
  MenubarIconStyle,
  menubarIconStyle,
  MenubarItemIconStyle,
  menubarItemIconStyle,
  MenubarStyle,
  menubarStyle,
  WeekStart,
  weekStart,
} from "../types/preferences";
import { captureException, Color, Icon, open } from "@raycast/api";
import { calMenubarTitle, curDay, curMonth, curYear } from "./calendar-utils";
import { weekNumber, weekNumberSun } from "weeknumber";

export const menubarTitle = () => {
  return menubarStyle !== MenubarStyle.ICON_ONLY ? calMenubarTitle : undefined;
};
export const menubarIcon = () => {
  return menubarStyle !== MenubarStyle.DATE_ONLY
    ? {
        source: menubarIconStyle === MenubarIconStyle.Day ? `day-icon/day-${curDay}.png` : "calendar-menubar-icon.png",
        tintColor: { light: "#000000", dark: "#FFFFFF", adjustContrast: false },
      }
    : undefined;
};

export const extraItemIcon = (fileIcon: string, raycastIcon: Icon) => {
  return menubarItemIconStyle === MenubarItemIconStyle.NATIVE
    ? { fileIcon: fileIcon }
    : menubarItemIconStyle === MenubarItemIconStyle.RAYCAST
      ? raycastIcon
      : undefined;
};

export function getWeekNumIcon(day: number, year: number = curYear, month: number = curMonth) {
  const date = new Date(year, month, day);
  const weekNum = () => {
    let weekNumber_: number;
    if (weekStart === WeekStart.SUNDAY) {
      weekNumber_ = weekNumberSun(date);
    } else {
      weekNumber_ = weekNumber(date);
    }
    if (weekNumber_ < 10) {
      return `0${weekNumber_}`;
    } else {
      return `${weekNumber_}`;
    }
  };
  return `number-${weekNum()}-16` as Icon;
}

export const getWeekNumberColor = highlightCalendar ? Color.SecondaryText : "#787878";

export const openApp = async (appName: string) => {
  try {
    await open(appName);
  } catch (e) {
    captureException(e);
    console.error(e);
  }
};
