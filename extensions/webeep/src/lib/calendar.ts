import { callWs } from "./moodle";
import { htmlToMarkdown, htmlToText } from "./html";
import { Lang, resolveMlang } from "./mlang";

export interface RawEvent {
  id: number;
  name: string;
  description?: string;
  timestart: number;
  timeduration?: number;
  timesort?: number;
  eventtype: string;
  modulename?: string | null;
  url?: string;
  viewurl?: string;
  overdue?: boolean;
  course?: { id: number; fullname: string } | null;
  action?: { name: string; url: string; actionable: boolean } | null;
}

export interface CalendarEvent {
  id: number;
  name: string;
  description: string;
  start: Date;
  end?: Date;
  eventType: string;
  moduleName?: string;
  url?: string;
  overdue: boolean;
  courseId?: number;
  courseName?: string;
  actionName?: string;
  actionUrl?: string;
}

export function toCalendarEvent(raw: RawEvent, lang: Lang): CalendarEvent {
  return {
    id: raw.id,
    name: htmlToText(resolveMlang(raw.name, lang)),
    description: raw.description ? htmlToMarkdown(raw.description) : "",
    start: new Date(raw.timestart * 1000),
    end: raw.timeduration ? new Date((raw.timestart + raw.timeduration) * 1000) : undefined,
    eventType: raw.eventtype,
    moduleName: raw.modulename || undefined,
    url: raw.url || raw.viewurl || undefined,
    overdue: Boolean(raw.overdue),
    courseId: raw.course?.id,
    courseName: raw.course ? htmlToText(resolveMlang(raw.course.fullname, lang)) : undefined,
    actionName: raw.action?.actionable ? raw.action.name : undefined,
    actionUrl: raw.action?.actionable ? raw.action.url : undefined,
  };
}

/** Merges two lists of raw events, de-duplicated by id and sorted by start date. */
export function mergeEvents(lists: RawEvent[][], lang: Lang): CalendarEvent[] {
  const seen = new Set<number>();
  const merged: CalendarEvent[] = [];
  for (const raw of lists.flat()) {
    if (seen.has(raw.id)) continue;
    seen.add(raw.id);
    merged.push(toCalendarEvent(raw, lang));
  }
  return merged.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Dashboard "upcoming" view plus action events (deadlines without a lookahead limit). */
export async function fetchUpcomingEvents(lang: Lang, now = Date.now()): Promise<CalendarEvent[]> {
  const [upcoming, actions] = await Promise.all([
    callWs<{ events: RawEvent[] }>("core_calendar_get_calendar_upcoming_view", {}),
    callWs<{ events: RawEvent[] }>("core_calendar_get_action_events_by_timesort", {
      timesortfrom: Math.floor(now / 1000),
      limitnum: 50,
    }),
  ]);
  return mergeEvents([upcoming.events, actions.events], lang);
}
