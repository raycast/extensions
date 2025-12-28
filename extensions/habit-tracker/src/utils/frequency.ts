import { getDay } from "date-fns";
import { Frequency } from "../types/habit";
import { parseDate_YYYYMMDD } from "./date";

export function isHabitDueOnDate(
  frequency: Frequency,
  dateStr: string | Date
): boolean {
  if (frequency === "daily") return true;
  if (!Array.isArray(frequency)) return true; // Default to daily if invalid

  const date =
    typeof dateStr === "string" ? parseDate_YYYYMMDD(dateStr) : dateStr;
  const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

  return frequency.includes(dayOfWeek);
}

export const DAYS_OF_WEEK = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];
