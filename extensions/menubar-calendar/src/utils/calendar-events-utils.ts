import { captureException, Icon } from "@raycast/api";
import { curDay } from "./calendar-utils";
import { CalendarEvent, Status } from "../hooks/useCalendar";
import { extractFirstUrl, formatMonthDateWithWeek } from "./common-utils";
import { Reminder } from "../hooks/useReminders";

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
    const date = new Date(timestamp);
    if (date.getDate() == curDay) {
      return "Today";
    }
    return formatMonthDateWithWeek(new Date(timestamp));
  } catch (e) {
    captureException(e);
    console.error(e);
    return "";
  }
}

export function formatEventTime(startTimestamp: number, endTimestamp: number, isAllDay: boolean): string {
  const startDate = getCalendarSectionTitle(startTimestamp);
  if (isAllDay) {
    return startDate + "  All Day";
  } else {
    const startTime = new Date(startTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const endTime = new Date(endTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return startDate + "  " + startTime + " - " + endTime;
  }
}

export function formatEventTimeMultiSection(startTimestamp: number): string {
  return getCalendarSectionTitle(startTimestamp);
}
export function formatEventTimeMultiItemSubtitle(
  startTimestamp: number,
  endTimestamp: number,
  isAllDay: boolean,
): string {
  if (isAllDay) {
    return "All Day";
  } else {
    const startTime = new Date(startTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const endTime = new Date(endTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return startTime + "-" + endTime;
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

export function findFirstEventWithinNHours(
  events: CalendarEvent[],
  hours: number,
): { event: CalendarEvent | null; timeUntilEvent: string } {
  const hoursInMs = hours * 60 * 60 * 1000;
  if (hours === 0 || events.length === 0) {
    return { event: null, timeUntilEvent: "" };
  }

  const now = Date.now();
  if (hours === -1) {
    const timeUntilEventMs_ = events[0].startDate - now;
    const timeUntilEvent_ = formatTimeUntilEvent(timeUntilEventMs_);
    return { event: events[0], timeUntilEvent: timeUntilEvent_ };
  }
  const upcomingEvents = events.filter((event) => event.startDate > now && event.startDate <= now + hoursInMs);

  if (upcomingEvents.length === 0) {
    return { event: null, timeUntilEvent: "" };
  }

  // find the event that starts first
  const firstEvent = upcomingEvents.sort((a, b) => a.startDate - b.startDate)[0];

  // calculate time until the event
  const timeUntilEventMs = firstEvent.startDate - now;
  const timeUntilEvent = formatTimeUntilEvent(timeUntilEventMs);

  return { event: firstEvent, timeUntilEvent };
}

function formatTimeUntilEvent(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) {
    return `${minutes}m`;
  } else if (hours < 24) {
    return `${hours}h${minutes % 60 !== 0 ? ` ${minutes % 60}m` : ""}`;
  } else {
    const remainingHours = hours % 24;
    return `${days}d${remainingHours !== 0 ? ` ${remainingHours}h` : ""}${minutes % 60 !== 0 ? ` ${minutes % 60}m` : ""}`;
  }
}

export function buildCalendarToolTip(event: CalendarEvent) {
  const recurringIcon = event.hasRecurrenceRules ? " ♺" : "";
  const date = "\n" + "· " + formatEventTimeMultiItemSubtitle(event.startDate, event.endDate, event.isAllDay);
  const calendarTitle = event.calendarTitle ? "\n" + "· " + event.calendarTitle : "";
  const eventUrl = getEventUrl(event);
  const url = eventUrl ? "\n" + "· " + eventUrl : "";
  const notes = event.notes ? "\n" + "· " + event.notes : "";
  return "· " + event.title + recurringIcon + calendarTitle + date + url + notes;
}

export function getEventUrl(event: CalendarEvent | Reminder) {
  const urlInNotes = extractFirstUrl(event.notes ?? "");
  return event.url ? event.url : urlInNotes;
}
