import { listCalendars } from "../api";

export default async function tool() {
  const calendars = await listCalendars();
  return {
    currentTime: new Date().toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    calendars: calendars.map((calendar) => ({
      id: calendar.id,
      accountId: calendar.accountId,
      name: calendar.name,
      canWrite: Boolean(
        calendar.myRights?.mayWriteAll || calendar.myRights?.mayWriteOwn,
      ),
    })),
  };
}
