import { CalendarEvent } from "../ai-text-to-calendar";
import { parseDateTimes } from "../utils";

export function toOutlookOfficeURL(event: CalendarEvent) {
  const baseUrl = "https://outlook.office.com/calendar/deeplink/compose";
  return baseUrl + createQueryStringOfOutlook(event);
}

export function toOutlookPersonalURL(event: CalendarEvent) {
  const baseUrl = "https://outlook.live.com/calendar/deeplink/compose";
  return baseUrl + createQueryStringOfOutlook(event);
}

function formatDateTimeForOutlook(dateStr: string, timeStr: string): string {
  if (dateStr.length !== 8) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYYMMDD.`);
  }
  if (timeStr.length !== 6) {
    throw new Error(`Invalid time format: ${timeStr}. Expected hhmmss.`);
  }

  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);

  const hh = timeStr.slice(0, 2);
  const mm = timeStr.slice(2, 4);
  const ss = timeStr.slice(4, 6);

  return `${year}-${month}-${day}T${hh}:${mm}:${ss}00`;
}

function createQueryStringOfOutlook(event: CalendarEvent) {
  const dateTimes = parseDateTimes(event);

  const startDateTime = `${formatDateTimeForOutlook(dateTimes.startDate, dateTimes.startTime)}`;
  const endDateTime = `${formatDateTimeForOutlook(dateTimes.endDate, dateTimes.endTime)}`;

  const params = {
    text: encodeURIComponent(event.title),
    startdt: startDateTime,
    enddt: endDateTime,
    body: encodeURIComponent(event.details),
    location: encodeURIComponent(event.location),
  };
  return `?subject=${params.text}&startdt=${params.startdt}&enddt=${params.enddt}&body=${params.body}&location=${params.location}`;
}
