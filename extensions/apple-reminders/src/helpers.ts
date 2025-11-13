import { UTCDate } from "@date-fns/utc";
import { Color, Icon } from "@raycast/api";
import { addDays, format, isThisYear, isBefore, formatISO, isSameDay } from "date-fns";

import { Location, Priority } from "./hooks/useData";

export function isFullDay(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function getDateString(date: string) {
  return isFullDay(date) ? date : formatISO(date, { representation: "date" });
}

export function getTodayInLocalTime() {
  return formatISO(new Date(), { representation: "date" });
}

export function isOverdue(date: string) {
  return isBefore(date, isFullDay(date) ? getTodayInLocalTime() : new Date());
}

export function isToday(date: string) {
  return isSameDay(date, isFullDay(date) ? getTodayInLocalTime() : new Date());
}

export function isTomorrow(date: string) {
  const today = isFullDay(date) ? getTodayInLocalTime() : new Date();
  return isSameDay(date, addDays(today, 1));
}

export function displayDueDate(date: string) {
  if (isToday(date)) {
    return "Today";
  }

  if (isTomorrow(date)) {
    return "Tomorrow";
  }

  const today = getTodayInLocalTime();
  const nextWeek = addDays(today, 7);

  if (isBefore(date, nextWeek)) {
    return format(new UTCDate(date), "eeee");
  }

  if (isThisYear(date)) {
    return format(new UTCDate(date), "dd MMMM");
  }

  return format(new UTCDate(date), "dd MMMM yyy");
}

export function getPriorityIcon(priority: Priority) {
  if (priority === "high") {
    return {
      source: Icon.Exclamationmark3,
      tintColor: Color.Red,
    };
  }

  if (priority === "medium") {
    return {
      source: Icon.Exclamationmark2,
      tintColor: Color.Yellow,
    };
  }

  if (priority === "low") {
    return {
      source: Icon.Exclamationmark,
      tintColor: Color.Blue,
    };
  }

  return undefined;
}

export function getLocationDescription(location: Location) {
  const radius = Intl.NumberFormat("en", { style: "unit", unit: "meter", unitDisplay: "long" }).format(
    location.radius ? location.radius : 100,
  );

  return `${location.proximity === "enter" ? "Arriving at:" : "Leaving:"} ${location.address} (within ${radius})`;
}

export function truncate(str: string, maxLength = 45): string {
  if (str.length <= maxLength) {
    return str;
  }

  return str.substring(0, maxLength) + "…";
}

export function getIntervalValidationError(interval?: string): string | undefined {
  if (!interval) return "Interval is required";
  if (isNaN(Number(interval))) return "Interval must be a number";
  if ((interval as unknown as number) < 1) return "Must be greater than 0";
}

// Colors that Apple Reminders uses (sRGB values that display as Display P3 on screen)
// These are the values we SET, which render as the Display P3 colors users see
type TintColor = Color.ColorLike;

type ColorOption = {
  title: string;
  value: string;
  color: TintColor;
};

export const colorOptions: ColorOption[] = [
  { title: "Red", value: "#FF2968", color: Color.Red },
  { title: "Orange", value: "#FF9500", color: Color.Orange },
  { title: "Yellow", value: "#FFCC00", color: Color.Yellow },
  { title: "Green", value: "#63DA38", color: Color.Green },
  { title: "Light Blue", value: "#5AC8FA", color: Color.Blue },
  { title: "Dark Blue", value: "#5856D6", color: Color.Blue },
  { title: "Purple", value: "#CC73E1", color: Color.Purple },
  { title: "Magenta", value: "#FF2D55", color: Color.Magenta },
  { title: "Brown", value: "#A2845E", color: Color.Brown },
  { title: "Light Brown", value: "#D9A69F", color: "#D9A69F" },
  { title: "Gray", value: "#5B626A", color: Color.SecondaryText },
];

const baseColorMap: Record<string, TintColor> = {
  // Display P3 screen colors (what users actually see) - for recognition when reading
  "#FF453A": Color.Red,
  "#FF9F0B": Color.Orange,
  "#FED709": Color.Yellow,
  "#31D15B": Color.Green,
  "#78C3FF": Color.Blue,
  "#5E5CE6": Color.Blue,
  "#D57FF5": Color.Purple,
  "#FF4F79": Color.Magenta,
  "#C9A675": Color.Brown,
  "#EBB5AE": "#EBB5AE",
  "#727E87": Color.SecondaryText,
  // Legacy/alternative color mappings
  "#FF3B30": Color.Red,
  "#34C759": Color.Green,
  "#007AFF": Color.Blue,
  "#AF52DE": Color.Purple,
  "#8E8E93": Color.SecondaryText,
};

colorOptions.forEach((option) => {
  baseColorMap[option.value] = option.color;
});

const colorMap = baseColorMap;

export function getListColorIcon(colorHex: string) {
  return { source: Icon.Circle, tintColor: colorMap[colorHex] || colorHex };
}
