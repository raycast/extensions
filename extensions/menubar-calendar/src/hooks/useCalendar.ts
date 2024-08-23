import { useCachedPromise } from "@raycast/utils";
import { getCalendarEvents } from "swift:../../swift/AppleReminders";

export type CalendarEvent = {
  title: string;
  startDate: number;
  endDate: number;
  openUrl: string;
  isAllDay: boolean;
  status: string;
  color: string;
};

export type Calendar = {
  title: string;
  color: string;
};

export type CalendarData = {
  calendar: Calendar;
  events: CalendarEvent[];
};

export enum Status {
  None = "None",
  Confirmed = "Confirmed",
  Tentative = "Tentative",
  Canceled = "Canceled",
}

export function useCalendar() {
  return useCachedPromise(() => {
    return getCalendarEvents(7) as Promise<CalendarData[]>;
  });
}
