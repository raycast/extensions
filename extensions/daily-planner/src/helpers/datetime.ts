import { addDays, endOfDay, format, formatRelative, isSameDay, startOfDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import { TimeValueInterval } from "../types";

export const TODAY = "Today";

export const now = new Date();
export const startOfToday = startOfDay(now);
export const endOfToday = endOfDay(now);

const seven = 7;
const startOfSevenDaysAgo = addDays(startOfToday, -seven).getTime();
const endOfSeventhDayFromNow = addDays(endOfToday, seven).getTime();

export const today: TimeValueInterval = {
  start: startOfToday.getTime(),
  end: endOfToday.getTime(),
};

export const todayAndNextSevenDays: TimeValueInterval = {
  start: startOfToday.getTime(),
  end: endOfSeventhDayFromNow,
};

export const restOfTodayAndNextSevenDays: TimeValueInterval = {
  start: now.getTime(),
  end: endOfSeventhDayFromNow,
};

export const fourteenDayInterval: TimeValueInterval = {
  start: startOfSevenDaysAgo,
  end: endOfSeventhDayFromNow,
};

// FormatRelativeToken defined in https://github.com/date-fns/date-fns/blob/main/src/locale/types.ts
const formatRelativeDateOnlyLocale: Record<string, string> = {
  lastWeek: "'Last' eeee",
  yesterday: "'Yesterday'",
  today: `'${TODAY}'`,
  tomorrow: "'Tomorrow'",
  nextWeek: "eeee",
  other: "P",
};

// FormatRelativeToken defined in https://github.com/date-fns/date-fns/blob/main/src/locale/types.ts
const formatRelativeDateTimeLocale: Record<string, string> = {
  lastWeek: "'Last' eeee, p",
  yesterday: "'Yesterday', p",
  today: `'${TODAY}', p`,
  tomorrow: "'Tomorrow', p",
  nextWeek: "eeee, p",
  other: "Pp",
};

export function formatRelativeDateOnly(date: Date | number, baseDate: Date | number = now): string {
  return formatRelative(date, baseDate, {
    locale: {
      ...enUS,
      formatRelative: (token: string) => formatRelativeDateOnlyLocale[token],
    },
  });
}

export function formatRelativeDateTime(date: Date | number, baseDate: Date | number = now): string {
  return formatRelative(date, baseDate, {
    locale: {
      ...enUS,
      formatRelative: (token: string) => formatRelativeDateTimeLocale[token],
    },
  });
}

export function formatRelativeTimeInterval({ start, end }: Interval): string {
  if (isSameDay(start, end)) {
    const relativeDate = formatRelativeDateOnly(start);
    const formattedStartTime = format(start, "h:mm a");
    const formattedEndTime = format(end, "h:mm a");
    const shortenedStartTime = formattedStartTime.endsWith(formattedEndTime.slice(-2))
      ? formattedStartTime.slice(0, -3)
      : formattedStartTime;
    return relativeDate + ", " + shortenedStartTime + " - " + formattedEndTime;
  }
  return formatRelativeDateTime(start) + " - " + formatRelativeDateTime(end);
}

export function formatInterval({ start, end }: Interval): string {
  if (isSameDay(start, end)) {
    // isToday(start) causes "JS heap out of memory" error.
    if (isSameDay(start, now)) {
      return format(start, "p") + " - " + format(end, "p");
    }
    return formatRelativeDateTime(start, now) + " - " + format(end, "p");
  }
  return formatRelativeDateTime(start, now) + " - " + formatRelativeDateTime(end, now);
}

function isStartOfDay(date: Date): boolean {
  return date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0;
}

function isEndOfDay(date: Date): boolean {
  return (
    date.getHours() === 23 && date.getMinutes() === 59 && date.getSeconds() === 59 && date.getMilliseconds() === 999
  );
}

export function formatDateInterval({ start, end }: { start: Date; end: Date }): string {
  if (isSameDay(start, end)) {
    if (isStartOfDay(start) && isEndOfDay(end)) {
      return formatRelativeDateOnly(start, now);
    }
    return formatRelativeDateTime(start, now) + " - " + format(end, "p");
  }
  if (isStartOfDay(start) && isEndOfDay(end)) {
    return formatRelativeDateOnly(start, now) + " - " + formatRelativeDateOnly(end, now);
  }
  return formatRelativeDateTime(start, now) + " - " + formatRelativeDateTime(end, now);
}

export function formatDuration(
  milliseconds: number,
  options?: { style?: "time" | "shortUnits" | "longUnits"; showSeconds?: boolean }
): string {
  const style = options?.style ?? "shortUnits";
  const showSeconds = options?.showSeconds ?? false;

  const seconds = (milliseconds - (milliseconds % 1_000)) / 1_000;
  const s = seconds % 60;
  const minutes = (seconds - s) / 60;
  const m = minutes % 60;
  const h = (minutes - m) / 60;

  switch (style) {
    case "time": {
      const addLeadingZero = (value: number): string =>
        value >= 10 ? value.toString() : value >= 0 ? "0" + value.toString() : Math.abs(value).toString();
      const hourMinute = h.toString() + ":" + addLeadingZero(m);
      return showSeconds ? hourMinute + ":" + addLeadingZero(s) : hourMinute;
    }
    case "shortUnits": {
      const components: string[] = [];
      if (h > 0) components.push(h.toString() + "h");
      if (m > 0) components.push(m.toString() + "m");
      if (showSeconds || (h === 0 && m === 0)) components.push(s.toString() + "s");
      return components.join(" ");
    }
    case "longUnits": {
      const components: string[] = [];
      if (h > 0) components.push(h.toString() + (h > 1 ? " hours" : " hour"));
      if (m > 0) components.push(m.toString() + (m > 1 ? " minutes" : " minute"));
      if (showSeconds || (h === 0 && m === 0)) components.push(s.toString() + (s > 1 ? " seconds" : " second"));
      return components.join(" ");
    }
  }
}
