import { toDidaDate } from "./date.js";
import { didaTimeZone, nowInTimeZone } from "./timezone.js";

export type SmartDateResult = {
  date?: Date;
  matchedText?: string;
  hasTime: boolean;
};

export function toTaskDatePayload(result?: SmartDateResult): {
  dueDate?: string;
  isAllDay?: boolean;
} {
  const timeZone = didaTimeZone();

  return {
    dueDate: toDidaDate(result?.date, timeZone),
    isAllDay: result?.date ? !result.hasTime : undefined,
  };
}

export function parseSmartDate(input: string): SmartDateResult {
  const text = input.trim();
  const now = nowInTimeZone();
  const dateMatch = matchDate(text, now);
  const timeMatch = matchTime(text);

  if (!dateMatch && !timeMatch) {
    return { hasTime: false };
  }

  const date = dateMatch?.date ?? startOfDay(now);

  if (timeMatch) {
    date.setHours(timeMatch.hour, timeMatch.minute, 0, 0);
  }

  return {
    date,
    matchedText: [dateMatch?.matchedText, timeMatch?.matchedText].filter(Boolean).join(" "),
    hasTime: Boolean(timeMatch),
  };
}

export function stripSmartDateText(input: string, result: SmartDateResult): string {
  let text = input;

  for (const part of result.matchedText?.split(" ").filter(Boolean) ?? []) {
    text = text.replace(part, " ");
  }

  return text.replace(/\s+/g, " ").trim();
}

export function dateFromPreset(preset: string, customDate?: string, customTime?: string): SmartDateResult {
  const now = nowInTimeZone();
  let date: Date | undefined;

  switch (preset) {
    case "today":
      date = startOfDay(now);
      break;
    case "tomorrow":
      date = addDays(now, 1);
      break;
    case "day_after_tomorrow":
      date = addDays(now, 2);
      break;
    case "weekend":
      date = nextWeekdayOrToday(now, 6);
      break;
    case "monday":
      date = nextWeekday(now, 1);
      break;
    case "next_week":
      date = addDays(now, 7);
      break;
    case "custom":
      date = parseCustomDate(customDate);
      break;
    case "none":
      return { hasTime: false };
  }

  const time = parseTime(customTime);
  if (date && time) {
    date.setHours(time.hour, time.minute, 0, 0);
  }

  return { date, hasTime: Boolean(time) };
}

function matchDate(text: string, now: Date): { date: Date; matchedText: string } | undefined {
  const fullDate = text.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (fullDate) {
    return {
      date: startOfDay(new Date(Number(fullDate[1]), Number(fullDate[2]) - 1, Number(fullDate[3]))),
      matchedText: fullDate[0],
    };
  }

  const shortDate = text.match(/\b(\d{1,2})[-/](\d{1,2})\b/);
  if (shortDate) {
    return {
      date: startOfDay(new Date(now.getFullYear(), Number(shortDate[1]) - 1, Number(shortDate[2]))),
      matchedText: shortDate[0],
    };
  }

  const rules: Array<[RegExp, Date]> = [
    [/今天|今日/, startOfDay(now)],
    [/明天/, addDays(now, 1)],
    [/后天/, addDays(now, 2)],
    [/昨天/, addDays(now, -1)],
    [/下周一|下星期一/, nextWeekday(now, 1)],
    [/周一|星期一/, nextWeekdayOrToday(now, 1)],
    [/周末|星期六|周六/, nextWeekdayOrToday(now, 6)],
  ];

  for (const [pattern, date] of rules) {
    const match = text.match(pattern);
    if (match) {
      return { date, matchedText: match[0] };
    }
  }

  return undefined;
}

function matchTime(text: string): { hour: number; minute: number; matchedText: string } | undefined {
  const clock = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (clock) {
    const hour = Number(clock[1]);
    const minute = Number(clock[2]);
    return isValidTime(hour, minute) ? { hour, minute, matchedText: clock[0] } : undefined;
  }

  const cn = text.match(/(上午|早上|中午|下午|晚上)?\s*(\d{1,2})\s*[点时](半|:(\d{2}))?/);
  if (!cn) {
    return undefined;
  }

  let hour = Number(cn[2]);
  const minute = cn[3] === "半" ? 30 : Number(cn[4] ?? 0);
  const period = cn[1];

  if ((period === "下午" || period === "晚上") && hour < 12) {
    hour += 12;
  }

  if (period === "中午" && hour < 11) {
    hour += 12;
  }

  return isValidTime(hour, minute) ? { hour, minute, matchedText: cn[0] } : undefined;
}

export function parseTime(value?: string): { hour: number; minute: number } | undefined {
  const text = value?.trim();

  if (!text) {
    return undefined;
  }

  const smart = matchTime(text);
  return smart ? { hour: smart.hour, minute: smart.minute } : undefined;
}

function parseCustomDate(value?: string): Date | undefined {
  const text = value?.trim();

  if (!text) {
    return undefined;
  }

  return parseSmartDate(text).date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function nextWeekday(date: Date, weekday: number): Date {
  const day = date.getDay();
  const daysUntilWeekday = (weekday - day + 7) % 7 || 7;
  return addDays(date, daysUntilWeekday);
}

function nextWeekdayOrToday(date: Date, weekday: number): Date {
  const day = date.getDay();
  const daysUntilWeekday = (weekday - day + 7) % 7;
  return addDays(date, daysUntilWeekday);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isValidTime(hour: number, minute: number): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}
