export type CalendarEvent = {
  id: string;
  title: string;
  calendar: string;
  start: string;
  end: string;
  allDay: boolean;
};

export type CalendarWindow = { start: Date; end: Date };

export function getCalendarWindow(list: string, days: unknown = 30, now = new Date()): CalendarWindow | null {
  if (list !== 'today' && list !== 'upcoming') return null;
  const parsed = Number(days);
  const count = Number.isFinite(parsed) && parsed >= 1 ? Math.min(365, Math.floor(parsed)) : 30;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (list === 'upcoming' ? 1 : 0));
  const end = new Date(start);
  end.setDate(end.getDate() + (list === 'today' ? 1 : count));
  return { start, end };
}

export function selectEvents(events: CalendarEvent[], names: string, range: CalendarWindow) {
  const selected = new Set(
    names
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  );
  const seen = new Set<string>();
  return events
    .filter((event) => {
      const key = JSON.stringify([event.calendar, event.id, event.start]);
      if (seen.has(key)) return false;
      seen.add(key);
      return (
        (!selected.size || selected.has(event.calendar)) &&
        new Date(event.start) < range.end &&
        new Date(event.end) > range.start
      );
    })
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || a.title.localeCompare(b.title))
    .map((event) => ({ ...event, key: JSON.stringify([event.calendar, event.id, event.start]) }));
}

export function eventTimeLabel(event: CalendarEvent, list: string): string {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const date = (value: Date) => value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = (value: Date) =>
    `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  if (event.allDay) {
    // EventKit all-day end dates are exclusive.
    const lastDay = new Date(end);
    lastDay.setDate(lastDay.getDate() - 1);
    const span = start.toDateString() === lastDay.toDateString() ? '' : `–${date(lastDay)}`;
    return list === 'upcoming' || span ? `${date(start)}${span} · All day` : 'All day';
  }
  const sameDay = start.toDateString() === end.toDateString();
  const prefix = list === 'upcoming' || !sameDay ? `${date(start)} · ` : '';
  return `${prefix}${time(start)}–${sameDay ? '' : `${date(end)} · `}${time(end)}`;
}
