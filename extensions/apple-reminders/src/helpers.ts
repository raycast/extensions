import { Color, Icon } from "@raycast/api";
import { addDays, format, isThisYear, isBefore, isSameDay, parseISO, startOfDay } from "date-fns";

import { Location, Priority } from "./hooks/useData";

export function parseDay(date?: string | null): Date {
  if (!date) {
    // Default to today in local time.
    return new Date(new Date().toDateString());
  }
  return new Date(parseISO(date).toDateString());
}

export function isOverdue(date: string) {
  const parsedDate = parseISO(date);

  if (parsedDate.getHours() === 0 && parsedDate.getMinutes() === 0) {
    return isBefore(startOfDay(parsedDate), startOfDay(new Date()));
  } else {
    return isBefore(parsedDate, new Date());
  }
}

export function displayDueDate(dateString: string) {
  const date = new Date(dateString);

  if (isOverdue(dateString)) {
    return isThisYear(date) ? format(date, "dd MMMM") : format(date, "dd MMMM yyy");
  }

  const today = startOfDay(new Date());

  if (isSameDay(date, today)) {
    return "Today";
  }

  if (isSameDay(date, addDays(today, 1))) {
    return "Tomorrow";
  }

  const nextWeek = addDays(today, 7);

  if (isBefore(date, nextWeek)) {
    return format(date, "eeee");
  }

  if (isThisYear(date)) {
    return format(date, "dd MMMM");
  }

  return format(date, "dd MMMM yyy");
}

export function isFullDay(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
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
