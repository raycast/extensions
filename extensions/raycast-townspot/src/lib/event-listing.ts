import { RaycastEvent } from "../types";

export type EventDaySection = {
  id: string;
  title: string;
  events: RaycastEvent[];
};

export type TimeWindow =
  | "now"
  | "all_upcoming"
  | "today"
  | "today_tomorrow"
  | "next_3_days"
  | "next_7_days"
  | "this_week";

const DEFAULT_TIMEZONE = "Europe/London";
const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;

const formatDateKey = (value: Date, timezone: string): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);

const sortEvents = (events: RaycastEvent[]): RaycastEvent[] =>
  [...events].sort((a, b) => {
    const aTime = Date.parse(a.startTime || "");
    const bTime = Date.parse(b.startTime || "");
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return aTime - bTime;
  });

const getEventWindowMs = (
  event: RaycastEvent,
): { startMs: number; endMs: number } | null => {
  const startMs = Date.parse(event.startTime || "");
  if (Number.isNaN(startMs)) return null;

  const parsedEndMs = Date.parse(event.endTime || "");
  const endMs =
    Number.isNaN(parsedEndMs) || parsedEndMs <= startMs
      ? startMs + DEFAULT_EVENT_DURATION_MS
      : parsedEndMs;

  return { startMs, endMs };
};

const keepUpcomingEvents = (events: RaycastEvent[]): RaycastEvent[] => {
  const nowMs = Date.now();
  return events.filter((event) => {
    const window = getEventWindowMs(event);
    if (!window) return false;
    return window.endMs > nowMs;
  });
};

export const isEventLiveNow = (event: RaycastEvent, nowMs = Date.now()): boolean => {
  const window = getEventWindowMs(event);
  if (!window) return false;
  return nowMs >= window.startMs && nowMs < window.endMs;
};

export const relativeStartTag = (
  event: RaycastEvent,
  nowMs = Date.now(),
): string | null => {
  if (isEventLiveNow(event, nowMs)) return "NOW";

  const window = getEventWindowMs(event);
  if (!window) return null;
  if (window.startMs <= nowMs) return null;

  const minutesUntilStart = Math.ceil((window.startMs - nowMs) / (60 * 1000));
  if (minutesUntilStart <= 0 || minutesUntilStart > 180) return null;
  return `in ${Math.min(minutesUntilStart, 60)}m`;
};

const dateKeyForOffset = (base: Date, timezone: string, offsetDays: number): string => {
  const shifted = new Date(base);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return formatDateKey(shifted, timezone);
};

const weekdayInTimezone = (value: Date, timezone: string): number => {
  const weekdayLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || DEFAULT_TIMEZONE,
    weekday: "short",
  }).format(value);

  const weekdays: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  return weekdays[weekdayLabel] || 1;
};

const dayLabel = (date: Date, timezone: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || DEFAULT_TIMEZONE,
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(date);

export const formatEventTime = (startTime: string, timezone: string): string => {
  const parsed = new Date(startTime);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || DEFAULT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
};

export const filterEventsByTimeWindow = (
  events: RaycastEvent[],
  timezone: string,
  timeWindow: TimeWindow,
): RaycastEvent[] => {
  const now = new Date();
  const nowMs = now.getTime();
  if (timeWindow === "now") {
    return events.filter((event) => isEventLiveNow(event, nowMs));
  }
  if (timeWindow === "all_upcoming") {
    return keepUpcomingEvents(events);
  }
  const todayKey = formatDateKey(now, timezone);
  const allowedDateKeys = new Set<string>();

  if (timeWindow === "today") {
    allowedDateKeys.add(todayKey);
  } else if (timeWindow === "today_tomorrow") {
    allowedDateKeys.add(todayKey);
    allowedDateKeys.add(dateKeyForOffset(now, timezone, 1));
  } else if (timeWindow === "next_3_days") {
    for (let offset = 0; offset < 3; offset += 1) {
      allowedDateKeys.add(dateKeyForOffset(now, timezone, offset));
    }
  } else if (timeWindow === "next_7_days") {
    for (let offset = 0; offset < 7; offset += 1) {
      allowedDateKeys.add(dateKeyForOffset(now, timezone, offset));
    }
  } else {
    const weekday = weekdayInTimezone(now, timezone);
    const daysUntilSunday = Math.max(0, 7 - weekday);
    for (let offset = 0; offset <= daysUntilSunday; offset += 1) {
      allowedDateKeys.add(dateKeyForOffset(now, timezone, offset));
    }
  }

  return keepUpcomingEvents(events).filter((event) => {
    const parsed = new Date(event.startTime || "");
    if (Number.isNaN(parsed.getTime())) return false;
    const eventDateKey = formatDateKey(parsed, timezone);
    return allowedDateKeys.has(eventDateKey);
  });
};

export const groupEventsByDay = (
  events: RaycastEvent[],
  timezone: string,
): EventDaySection[] => {
  const now = new Date();
  const todayKey = formatDateKey(now, timezone);
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowKey = formatDateKey(tomorrow, timezone);

  const grouped = new Map<string, EventDaySection>();
  const sortedEvents = sortEvents(events);

  for (const event of sortedEvents) {
    const parsed = new Date(event.startTime || "");
    if (Number.isNaN(parsed.getTime())) continue;

    const key = formatDateKey(parsed, timezone);
    if (!grouped.has(key)) {
      const title =
        key === todayKey
          ? "Today"
          : key === tomorrowKey
            ? "Tomorrow"
            : dayLabel(parsed, timezone);
      grouped.set(key, {
        id: key,
        title,
        events: [],
      });
    }

    grouped.get(key)?.events.push(event);
  }

  return Array.from(grouped.values());
};
