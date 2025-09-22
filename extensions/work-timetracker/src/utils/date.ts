import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  defaultStandardHoursPerDay: string;
}

/**
 * Calculates the number of weekdays (Monday-Friday) in a given month and year.
 * @param year The full year (e.g., 2023).
 * @param month The month, 0-indexed (0 for January, 11 for December).
 * @returns The number of weekdays in the specified month.
 */
export function getWeekdaysInMonth(year: number, month: number): number {
  let weekdays = 0;
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      weekdays++;
    }
    date.setDate(date.getDate() + 1);
  }
  return weekdays;
}

/**
 * Calculates the total standard working hours for a given month and year based on user preferences.
 * @param year The full year (e.g., 2023).
 * @param month The month, 0-indexed (0 for January, 11 for December).
 * @returns The total standard working hours for the month.
 */
export function getStandardHours(year: number, month: number): number {
  const preferences = getPreferenceValues<Preferences>();
  const hoursPerDayString = preferences.defaultStandardHoursPerDay || "8"; // Default to 8 if not set
  const hoursPerDay = parseFloat(hoursPerDayString);

  if (isNaN(hoursPerDay) || hoursPerDay <= 0) {
    console.warn(`Invalid value for defaultStandardHoursPerDay: ${hoursPerDayString}. Defaulting to 8.`);
    return getWeekdaysInMonth(year, month) * 8;
  }

  const weekdays = getWeekdaysInMonth(year, month);
  return weekdays * hoursPerDay;
}
