import moment from "moment";
import { CalendarEvent } from "../types/event";

export function eventDateString(event: CalendarEvent): string {
  if (event.start.dateTime) return event.start.dateTime.slice(8, 10);
  return "Date unknown";
}

export function eventGroupByDate(date: number, events: CalendarEvent[]): CalendarEvent[] {
  const eventsAtDate: CalendarEvent[] = [];
  events.map((event) => {
    if (date == Number(eventDateString(event))) {
      eventsAtDate.push(event);
    }
  });
  return eventsAtDate;
}

export function eventsDateRange(): Array<number> {
  const todaysDate = numericalDate(todayAsISO());
  const endOfMonthDate = numericalDate(endOfCurrentMonthAsISO());

  const dateRange = Array.from({ length: endOfMonthDate - todaysDate + 1 }, (value, index) => todaysDate + index);
  return dateRange;
}

export function eventActive(startTime: string, endTime: string): boolean {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return start <= new Date() && new Date() <= end;
}

export function eventFinished(endTime: string): boolean {
  return new Date(endTime) < new Date();
}

export function isToday(date: string): boolean {
  const todaysDate = todayAsISO().slice(8, 10);
  return Number(todaysDate) == Number(date);
}

export function todayAsISO(): string {
  return firstSecondOfDate(moment().format());
}

export function endOfCurrentMonthAsISO(): string {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
}

export function currentMonth(): string {
  switch (moment().month()) {
    case 0:
      return "Jan";
    case 1:
      return "Feb";
    case 2:
      return "Mar";
    case 3:
      return "Apr";
    case 4:
      return "May";
    case 5:
      return "Jun";
    case 6:
      return "Jul";
    case 7:
      return "Aug";
    case 8:
      return "Sep";
    case 9:
      return "Oct";
    case 10:
      return "Nov";
    case 11:
      return "Dec";
  }
  return "Unknown";
}

function numericalDate(dateTime: string): number {
  return Number(dateTime.slice(8, 10));
}

function firstSecondOfDate(date: string): string {
  return date.slice(0, 10) + "T00:01:00Z";
}
