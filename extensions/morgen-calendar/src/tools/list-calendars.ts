import { calendarReference } from "../lib/calendar-reference";
import { listCalendars } from "../lib/morgen";

export default async function tool() {
  const calendars = await listCalendars();
  return {
    currentTime: new Date().toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    calendars: calendars.map((calendar) => ({
      calendarRef: calendarReference(calendar),
      name: calendar.name,
      canWrite: Boolean(calendar.myRights?.mayWriteAll || calendar.myRights?.mayWriteOwn),
    })),
  };
}
