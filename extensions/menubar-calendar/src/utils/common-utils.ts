import {
  dateFormat,
  highlightCalendar,
  largeCalendar,
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
import { calMenubarTitle, curDay, curMonth, curYear, replaceWithFourPerEmSpace } from "./calendar-utils";
import { weekNumber, weekNumberSun } from "weeknumber";
import { format } from "date-fns";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const menubarTitle = () => {
  return menubarStyle !== MenubarStyle.ICON_ONLY ? calMenubarTitle : "";
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

// date:  month, day, year
export function formatDateWithCustomFormat(date: Date, customFormat: string = dateFormat) {
  if (customFormat === "macOS") {
    const divider = " ";
    const monthShort = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
    return monthShort + divider + date.getDate() + divider + date.getFullYear();
  } else {
    return format(date, customFormat);
  }
}

// date: week, month, day, year
export function formatYearDateWithWeek(date: Date, customFormat: string = dateFormat) {
  const weekDayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  const divider = replaceWithFourPerEmSpace(" ").repeat(2);
  if (customFormat === "macOS") {
    const monthShort = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
    return weekDayShort + divider + monthShort + divider + date.getDate() + divider + date.getFullYear();
  } else {
    return weekDayShort + divider + format(date, customFormat);
  }
}

// date: week, month, day
export function formatMonthDateWithWeek(date: Date, customFormat: string = dateFormat) {
  const weekDayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  const divider = " ";
  if (customFormat === "macOS") {
    const monthShort = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
    return weekDayShort + divider + monthShort + divider + date.getDate();
  } else {
    let sanitizedFormat = dateFormat.replace(/y+\/?|\/?y+/gi, "").trim();
    sanitizedFormat = sanitizedFormat
      .replace(/^\/|\/$/g, "")
      .replace(/^\.|\.$/g, "")
      .replace(/^-|-$/g, "");
    return weekDayShort + divider + format(date, sanitizedFormat);
  }
}

export function truncateMenubarTitle(str: string, maxLength: number = 60): string {
  let length = 0;
  let i;
  const finalStr = str;
  for (i = 0; i < finalStr.length; i++) {
    const charCode = finalStr.charCodeAt(i);
    if (charCode >= 0x4e00 && charCode <= 0x9fff) {
      length += 2.2;
    } else {
      length += 1;
    }

    if (length > maxLength) {
      break;
    }
  }

  return str.substring(0, i);
}

export function truncate(str: string, maxLength = largeCalendar ? 30 : 24): string {
  let length = 0;
  let i;
  const finalStr = str;
  for (i = 0; i < finalStr.length; i++) {
    const charCode = finalStr.charCodeAt(i);
    if (charCode >= 0x4e00 && charCode <= 0x9fff) {
      length += 2.2;
    } else {
      length += 1;
    }

    if (length > maxLength) {
      break;
    }
  }

  return str.substring(0, i) + (i < str.length ? "…" : "");
}

export function truncateSubtitle(title: string, subtitle: string, maxLength = largeCalendar ? 30 : 24): string {
  const calculateLength = (str: string): number => {
    let length = 0;
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      if (charCode >= 0x4e00 && charCode <= 0x9fff) {
        length += 2.2;
      } else {
        length += 1;
      }
    }
    return length;
  };

  const titleLength = calculateLength(title + " ");
  const availableLength = maxLength - titleLength;

  if (availableLength <= 0) {
    return "";
  }

  let truncatedSubtitle = "";
  let length = 0;

  for (let i = 0; i < subtitle.length; i++) {
    const charCode = subtitle.charCodeAt(i);
    if (charCode >= 0x4e00 && charCode <= 0x9fff) {
      length += 2.2;
    } else {
      length += 1;
    }

    if (length > availableLength) {
      truncatedSubtitle = subtitle.substring(0, i) + "…";
      break;
    } else {
      truncatedSubtitle = subtitle.substring(0, i + 1);
    }
  }

  return truncatedSubtitle;
}

export function extractFirstUrl(text: string): string | null {
  const urlPattern = /https?:\/\/[^\s/$.?#].[^\s]*/;
  const match = text.match(urlPattern);
  return match ? match[0] : null;
}
