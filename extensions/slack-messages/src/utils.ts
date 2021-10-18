import {
  differenceInCalendarYears,
  differenceInDays,
  differenceInHours,
  differenceInYears,
  format,
  formatDistanceToNow,
  formatRelative,
  isThisWeek,
  isThisYear,
  isToday,
} from "date-fns";

export function dateFromTimeStamp(ts: string): Date {
  return new Date(Number(ts.replace(".", "")) / 1000);
}

export const today = new Date();
export function dateDescription(date?: Date, displayTime?: boolean): string {
  if (date) {
    const diffD = differenceInDays(date, today);
    let dateFormat = "d MMM";

    if (diffD < 1 && isToday(date)) {
      dateFormat = "HH:mm";
    } else if (isThisWeek(date)) {
      if (diffD < 1 && !displayTime) {
        return formatDistanceToNow(date) + " ago";
      }
      dateFormat = "d EE";
    } else if (differenceInCalendarYears(date, today) >= 1) {
      dateFormat = "d MMM yyyy";
    }
    if (displayTime) {
      dateFormat += ", HH:mm";
    }
    return format(date, dateFormat);
  }
  return "";
}
