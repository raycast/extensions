import { runAppleScript } from '@raycast/utils';
import { calendarScript } from './calendar-script';
import { CalendarEvent, getCalendarWindow, selectEvents } from './calendar-model';

export async function getCalendarEvents(list: string, names: string, days: string, day: string) {
  // A changed local day refreshes the request on the next render; no event data is persisted.
  void day;
  const range = getCalendarWindow(list, days);
  if (!range) return [];
  const raw = await runAppleScript(calendarScript(range.start.toISOString(), range.end.toISOString()), {
    language: 'JavaScript',
    timeout: 60000,
  });
  const result = JSON.parse(raw) as { events?: CalendarEvent[]; error?: string };
  if (result.error) throw new Error(result.error);
  if (!Array.isArray(result.events)) throw new Error('Invalid response from macOS Calendar. Please retry.');
  return selectEvents(result.events, names, range);
}
