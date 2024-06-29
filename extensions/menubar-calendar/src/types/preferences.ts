import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  weekStart: string;
  menubarStyle: string;
  menubarIconStyle: string;
  menubarItemIconStyle: string;
  largeCalendar: boolean;
  highlightCalendar: boolean;
  showWeekNumber: boolean;
  showCalendar: boolean;
  calendarView: string;
  remindersView: string;
  showReminders: boolean;
  showSettings: boolean;
}

export const {
  weekStart,
  menubarStyle,
  menubarIconStyle,
  menubarItemIconStyle,
  largeCalendar,
  highlightCalendar,
  showWeekNumber,
  calendarView,
  remindersView,
  showCalendar,
  showReminders,
  showSettings,
} = getPreferenceValues<Preferences>();

export enum WeekStart {
  Monday = "1",
  SUNDAY = "0",
}

export enum MenubarStyle {
  ICON_AND_DATE = "both",
  ICON_ONLY = "iconOnly",
  DATE_ONLY = "dateOnly",
}

export enum MenubarIconStyle {
  Day = "Day",
  Calendar = "Calendar",
}

export enum MenubarItemIconStyle {
  RAYCAST = "Raycast",
  NATIVE = "Native",
  NONE = "None",
}
