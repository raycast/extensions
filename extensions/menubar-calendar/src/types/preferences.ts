import { getPreferenceValues } from "@raycast/api";

export const {
  weekStart,
  menubarStyle,
  menubarIconStyle,
  menubarItemIconStyle,
  showEventsInMenubar,
  titleTruncateLength,
  largeCalendar,
  highlightCalendar,
  showWeekNumber,
  dateFormat,
  calendarView,
  remindersView,
  showCalendar,
  showReminders,
  showSettings,
} = getPreferenceValues<Preferences.Index>();

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
