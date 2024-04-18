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
