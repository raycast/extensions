import { getPreferenceValues } from "@raycast/api";
import moment from "moment-timezone";

// Parse dates and adjust for selected timezone in preferences
export function parseDateAndTime(dateString: Date | null, timezone: string = getPreferenceValues().timezone || "UTC") {
  const date = moment.tz(dateString, timezone);
  const formattedDate = date.format("YYYY-MM-DD");
  const formattedTime = date.format("HH:mm");
  return { date: formattedDate, time: formattedTime };
}

export function getMinutesBetweenDates(date1: Date, date2: Date): number {
  const diffInMilliseconds = Math.abs(date2.getTime() - date1.getTime());
  return diffInMilliseconds / (1000 * 60);
}

/**
 * A function that returns a nice representation of some amount of hours and minutes.
 * For example 2.5 hours would be displayed as: 2 hours and 25 minutes.
 * @param hours
 * @returns
 */
export function hoursToNiceString(hours: number): string {
  const whole_hours = Math.floor(hours);
  const remaining_time = hours - whole_hours;
  const minutes = Math.round(60 * remaining_time);

  const hourPart = whole_hours === 1 ? `${whole_hours} hour` : `${whole_hours} hours`;
  const minutePart = minutes === 1 ? `${minutes} minute` : `${minutes} minutes`;

  if (whole_hours > 0 && minutes > 0) {
    return `${hourPart} and ${minutePart}`;
  } else if (whole_hours > 0) {
    return hourPart;
  } else if (minutes > 0) {
    return minutePart;
  } else {
    return "0 minutes";
  }
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function hoursBetween(time1: string, time2: string): number {
  const date1 = Date.parse(`1970-01-01T${time1}Z`);
  const date2 = Date.parse(`1970-01-01T${time2}Z`);

  const diffInMs = Math.abs(date2 - date1);
  return diffInMs / 1000 / 60 / 60;
}

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "Septemnber",
  "October",
  "November",
  "December",
];
