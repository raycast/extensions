import { CalendarEvent } from "../ai-text-to-calendar";
import { toGoolgleCalenderURL } from "./googleCalendar";
import { toOutlookOfficeURL, toOutlookPersonalURL } from "./outlookCalendar";

type CalendarType = "googleCalendar" | "outlookPersonal" | "outlookOffice";

export interface CalendarURLGenerator {
  (event: CalendarEvent): string;
}
const CALENDAR_URL_GENERATORS: Record<CalendarType, CalendarURLGenerator> = {
  googleCalendar: toGoolgleCalenderURL,
  outlookPersonal: toOutlookPersonalURL,
  outlookOffice: toOutlookOfficeURL,
};

export function toURL(calendarEvent: CalendarEvent, calendarType: CalendarType) {
  const generator = CALENDAR_URL_GENERATORS[calendarType];
  return generator(calendarEvent);
}
