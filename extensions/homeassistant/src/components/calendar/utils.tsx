import { getHAWSConnection } from "@lib/common";
import { State } from "@lib/haapi";
import { CalendarEvent } from "./hooks";
import { Color } from "@raycast/api";

export async function getHACalendars() {
  const con = await getHAWSConnection();
  const res = await con.sendMessagePromise({
    type: "calendars/list",
  });
  return res;
}

export interface CalendarEventDuration {
  hours: number;
  minutes: number;
  seconds: number;
}

export interface GetCalendarEventArgs {
  startDateTime?: Date;
  endDateTime?: Date;
  duration?: CalendarEventDuration;
}

export interface HAEvent {
  start: string;
  end: string;
  summary: string;
  description?: string;
  location?: string;
}

interface HACalendarResponse {
  events: HAEvent[] | undefined | null;
}

interface GetHACalendarsResponse {
  response?: [string: HACalendarResponse];
}

export function formatDateToHAString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export async function getCalendarEvents(calendarStates: State[] | undefined, args: GetCalendarEventArgs) {
  const con = await getHAWSConnection();
  const calcs = calendarStates?.filter((s) => s.entity_id.startsWith("calendar."));

  const msg = {
    type: "execute_script",
    sequence: [
      {
        service: "calendar.get_events",
        data: {
          start_date_time: args.startDateTime ? formatDateToHAString(args.startDateTime) : undefined,
          end_date_time: args.endDateTime ? formatDateToHAString(args.endDateTime) : undefined,
          duration: args.duration,
        },
        target: {
          entity_id: calcs?.map((s) => s.entity_id),
        },
        response_variable: "service_result",
      },
      {
        stop: "done",
        response_variable: "service_result",
      },
    ],
  };
  const rc: GetHACalendarsResponse | undefined = await con?.sendMessagePromise(msg);
  const d = rc?.response;
  return d;
}

export function isDateOnly(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const isoString = d.toISOString();
  return isoString.endsWith("T00:00:00.000Z");
}

export function isSameDatetime(d1: Date, d2: Date) {
  return d1.getTime() === d2.getTime();
}

export function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDay() === d2.getDay();
}

export function addDays(d: Date, days: number) {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

export function getTimeOnlyString(d: Date) {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function getDateOnlyStringUTC(d: Date) {
  return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}`;
}

export function getDateOnlyString(d: Date) {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

export function getDateOnlyUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function getDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function endOfDayUTC(date: Date) {
  const result = toUTCDate(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

export function nextStartOfDay(date: Date) {
  const nextDay = addDays(date, 1);
  const d = nextDay;
  return d;
}

interface DayEvents {
  day: Date;
  events: CalendarEvent[];
}

export function groupEventsByDay(events: CalendarEvent[] | undefined) {
  const temp: Record<string, CalendarEvent[]> = {};
  for (const e of events ?? []) {
    const t = getDateOnlyUTC(new Date(e.start)).toISOString();
    if (!(t in temp)) {
      temp[t] = [];
    }
    temp[t] = [...temp[t], e];
  }
  const result: DayEvents[] = [];
  for (const [t, v] of Object.entries(temp)) {
    result.push({
      day: new Date(t),
      events: v,
    });
  }
  return result;
}

const colorMap = [
  Color.Blue,
  Color.Green,
  Color.Magenta,
  Color.Orange,
  Color.Purple,
  Color.Yellow,
  "#FF5733", // Vibrant red-orange
  "#33FF57", // Vibrant green
  "#3357FF", // Vibrant blue
  "#FF33A1", // Vibrant pink
  "#A133FF", // Vibrant purple
  "#33FFA1", // Vibrant aqua
  "#FFBD33", // Vibrant gold
  "#33FFBD", // Vibrant light green
  "#57FF33", // Vibrant lime
  "#BD33FF", // Vibrant magenta
  "#33A1FF", // Vibrant sky blue
  "#5733FF", // Vibrant indigo
  "#A1FF33", // Vibrant chartreuse
  "#33FF33", // Vibrant green
  "#FF33FF", // Vibrant magenta
  "#33FFFF", // Vibrant cyan
  "#FF9933", // Vibrant orange
  "#33FF99", // Vibrant light green
  "#9933FF", // Vibrant purple
  "#33FFCC", // Vibrant mint
  "#FF6633", // Vibrant red-orange
  "#33FF66", // Vibrant green
  "#3366FF", // Vibrant blue
  "#FF3366", // Vibrant pink
  "#6633FF", // Vibrant indigo
  "#33FF33", // Vibrant green
  "#FF33CC", // Vibrant pink
  "#33CCFF", // Vibrant sky blue
  "#FFCC33", // Vibrant yellow
  "#33FFCC", // Vibrant mint
  "#CC33FF", // Vibrant purple
  "#33FF99", // Vibrant light green
  "#9933FF", // Vibrant purple
  "#33FF66", // Vibrant green
  "#FF9966", // Vibrant orange
  "#6699FF", // Vibrant blue
  "#FF6699", // Vibrant pink
  "#9966FF", // Vibrant purple
  "#66FF99", // Vibrant light green
  "#FF3399", // Vibrant pink
  "#3399FF", // Vibrant sky blue
  "#FF6633", // Vibrant red-orange
  "#33FF66", // Vibrant green
  "#3366FF", // Vibrant blue
  "#FF3366", // Vibrant pink
  "#6633FF", // Vibrant indigo
  "#33FF33", // Vibrant green
  "#FF33CC", // Vibrant pink
];

export function getCalendarColorByIndex(index: number) {
  if (index < 0) {
    return Color.PrimaryText;
  }
  const mi = index % colorMap.length;
  return colorMap[mi];
}

export function isAllDayEvent(event: CalendarEvent | HAEvent) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return addDays(start, 1).getTime() === end.getTime();
}

export function humanEventTimeRange(ev: CalendarEvent) {
  const start = new Date(ev.start);
  const end = new Date(ev.end);
  if (isAllDayEvent(ev)) {
    return "All Day";
  } else if (isSameDay(start, end)) {
    return `${getTimeOnlyString(start)} - ${getTimeOnlyString(end)}`;
  }
  return `${ev.start} - ${ev.end}`;
}

export function sortCalendarEvents(events: CalendarEvent[] | undefined) {
  return events?.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function dateDayName(d: Date) {
  if (isSameDay(new Date(), d)) {
    return "Today";
  } else if (isSameDay(nextStartOfDay(new Date()), d)) {
    return "Tomorrow";
  }
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

export interface CalendarState extends State {
  color?: Color.ColorLike;
}

export function calendarEventKey(event: CalendarEvent) {
  return `${event.entityId}${event.start}${event.end}${event.summary}`;
}

export function secondsBetweenDates(d1: Date, d2: Date) {
  return Math.abs(d1.getTime() - d2.getTime()) / 1000;
}

export function minutesBetweenDates(d1: Date, d2: Date) {
  return secondsBetweenDates(d1, d2) / 60;
}

export function toUTCDate(date: Date) {
  return new Date(date.toISOString());
}

export function nowUTC() {
  return toUTCDate(new Date());
}

export function isPastEvent(event: CalendarEvent) {
  const end = toUTCDate(new Date(event.end));
  return end.getTime() < nowUTC().getTime();
}
