import {
  highlightCalendar,
  largeCalendar,
  MenubarIconStyle,
  menubarIconStyle,
  MenubarItemIconStyle,
  menubarItemIconStyle,
  MenubarStyle,
  menubarStyle,
} from "../types/preferences";
import { captureException, Color, Icon, open } from "@raycast/api";
import { calMenubarTitle, nepaliDay } from "./calendar-utils";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const menubarTitle = () => {
  return menubarStyle !== MenubarStyle.ICON_ONLY ? calMenubarTitle : "";
};
export const menubarIcon = () => {
  return menubarStyle !== MenubarStyle.DATE_ONLY
    ? {
        source:
          menubarIconStyle === MenubarIconStyle.Day ? `day-icon/day-${nepaliDay}.png` : "calendar-menubar-icon.png",
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

export const getWeekNumberColor = highlightCalendar ? Color.SecondaryText : "#787878";

export const openApp = async (appName: string) => {
  try {
    await open(appName);
  } catch (e) {
    captureException(e);
    console.error(e);
  }
};

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
