import { CalendarEvent } from "../ai-text-to-calendar";

export function parseDateTimes(event: CalendarEvent) {
  const startDate = event.start_date.replace(/\D/g, "");
  const startTime = event.start_time.replace(/\D/g, "");
  const endDate = event.end_date.replace(/\D/g, "");
  const endTime = event.end_time.replace(/\D/g, "");

  return { startDate, startTime, endDate, endTime };
}
