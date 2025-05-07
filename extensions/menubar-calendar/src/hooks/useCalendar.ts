import { useCachedPromise } from "@raycast/utils";
import { getCalendarEvents } from "swift:../../swift/AppleReminders";

export type CalendarEvent = {
  title: string;
  notes: string;
  url: string;
  startDate: number;
  endDate: number;
  openUrl: string;
  isAllDay: boolean;
  status: string;
  color: string;
  calendarTitle: string;
  hasRecurrenceRules: boolean;
};

export type Calendar = {
  id: string;
  title: string;
  color: string;
  source: string;
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
    try {
      return getCalendarEvents(7) as Promise<CalendarData[]>;
    } catch (error) {
      console.error("Failed to fetch calendar events:", error);
      return Promise.resolve([] as CalendarData[]);
    }
  });
}
