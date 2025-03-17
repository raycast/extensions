import { CalendarEvent } from "../ai-text-to-calendar";
import { parseDateTimes } from "../utils";

export function toGoolgleCalenderURL(event: CalendarEvent) {
  const dateTimes = parseDateTimes(event);

  // Clean up and format dates/times - remove any non-numeric characters
  const startDateTime = `${dateTimes.startDate}T${dateTimes.startTime}00`;
  const endDateTime = `${dateTimes.endDate}T${dateTimes.endTime}00`;
  const params = {
    text: encodeURIComponent(event.title),
    dates: `${startDateTime}/${endDateTime}`,
    details: encodeURIComponent(event.details),
    location: encodeURIComponent(event.location),
  };
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${params.text}&dates=${params.dates}&details=${params.details}&location=${params.location}&trp=false`;
}
