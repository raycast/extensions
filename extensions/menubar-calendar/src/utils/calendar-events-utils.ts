import { captureException, Icon } from "@raycast/api";
import { curDay } from "./calendar-utils";
import { Status } from "../hooks/useCalendar";

export function timeStampIsToday(timestamp: number, now: Date) {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, -1);
  const dateFromTimestamp = new Date(timestamp);
  return dateFromTimestamp >= todayStart && dateFromTimestamp <= todayEnd;
}

export function timeStampIsThreeDay(timestamp: number, now: Date) {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const threeDaysEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
  const dateFromTimestamp = new Date(timestamp);
  return dateFromTimestamp >= todayStart && dateFromTimestamp <= threeDaysEnd;
}

function getCalendarSectionTitle(timestamp: number): string {
  try {
    return macDateFormat(timestamp);
  } catch (e) {
    captureException(e);
    console.error(e);
    return "Calendar";
  }
}

function macDateFormat(timestamp: number) {
  const date = new Date(timestamp);
  if (date.getDate() == curDay) {
    return "Today";
  }
  const monthShort = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  const weekDayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  return weekDayShort + " " + monthShort + " " + date.getDate();
}

export function formatTimestamp(startTimestamp: number, endTimestamp: number, isAllDay: boolean): string {
  const startDate = getCalendarSectionTitle(startTimestamp);
  if (isAllDay) {
    return startDate + "  All Day";
  } else {
    const startTime = new Date(startTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const endTime = new Date(endTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return startDate + "  " + startTime + " - " + endTime;
  }
}

export function getCalendarIcon(status: string, color: string) {
  switch (status) {
    case Status.Confirmed:
      return { source: Icon.CheckCircle, tintColor: color };
    case Status.Tentative:
      return { source: Icon.QuestionMarkCircle, tintColor: color };
    case Status.Canceled:
      return { source: Icon.CircleDisabled, tintColor: color };
    default:
      return { source: "vertical-line.png", tintColor: color };
  }
}
