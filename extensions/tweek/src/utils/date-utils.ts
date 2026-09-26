import { DateFormatPreference, WeekStartPreference } from "../types";

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(isoDate: string): Date {
  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);
  return new Date(year, month, day, 12, 0, 0, 0);
}

export function getTodayISO(referenceDate: Date = new Date()): string {
  return toISODateString(referenceDate);
}

export function addDaysISO(isoDate: string, days: number): string {
  const date = parseISODate(isoDate);
  date.setDate(date.getDate() + days);
  return toISODateString(date);
}

export function getWeekBoundsISO(
  referenceDate: Date = new Date(),
  weekStartsOn: WeekStartPreference = "Monday",
): { startISO: string; endISO: string } {
  const d = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
    0,
    0,
  );
  const currentDay = d.getDay(); // 0 (Sun) to 6 (Sat)
  const diffToStart =
    weekStartsOn === "Monday"
      ? currentDay === 0
        ? -6
        : 1 - currentDay
      : -currentDay;

  const start = new Date(d);
  start.setDate(d.getDate() + diffToStart);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    startISO: toISODateString(start),
    endISO: toISODateString(end),
  };
}

/**
 * Returns a bounded window (within Tweek's 92-day limit for expand=occurrences)
 * covering recent overdue tasks (14 days ago) through upcoming tasks (21 days ahead).
 */
export function getDashboardFetchWindowISO(referenceDate: Date = new Date()): {
  dateFrom: string;
  dateTo: string;
} {
  const todayISO = getTodayISO(referenceDate);
  return {
    dateFrom: addDaysISO(todayISO, -14),
    dateTo: addDaysISO(todayISO, 21),
  };
}

export function formatTaskDate(
  isoDate: string | null | undefined,
  format: DateFormatPreference = "dd/MM/yyyy",
): string {
  if (!isoDate) {
    return "Someday";
  }
  const parts = isoDate.split("-");
  if (parts.length !== 3) {
    return isoDate;
  }
  const [yyyy, mm, dd] = parts;
  if (format === "MM/dd/yyyy") {
    return `${mm}/${dd}/${yyyy}`;
  }
  return `${dd}/${mm}/${yyyy}`;
}

export function formatRelativeTaskDate(
  isoDate: string | null | undefined,
  format: DateFormatPreference = "dd/MM/yyyy",
  referenceDate: Date = new Date(),
): string {
  if (!isoDate) {
    return "Someday";
  }
  const todayISO = getTodayISO(referenceDate);
  const tomorrowISO = addDaysISO(todayISO, 1);
  const yesterdayISO = addDaysISO(todayISO, -1);

  if (isoDate === todayISO) return "Today";
  if (isoDate === tomorrowISO) return "Tomorrow";
  if (isoDate === yesterdayISO) return "Yesterday";

  const dateObj = parseISODate(isoDate);
  const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" });
  return `${weekday}, ${formatTaskDate(isoDate, format)}`;
}

export function isOverdue(
  isoDate: string | null | undefined,
  done: boolean,
  referenceDate: Date = new Date(),
): boolean {
  if (!isoDate || done) return false;
  const todayISO = getTodayISO(referenceDate);
  return isoDate < todayISO;
}

export function isInCurrentWeek(
  isoDate: string | null | undefined,
  weekStartsOn: WeekStartPreference = "Monday",
  referenceDate: Date = new Date(),
): boolean {
  if (!isoDate) return false;
  const { startISO, endISO } = getWeekBoundsISO(referenceDate, weekStartsOn);
  return isoDate >= startISO && isoDate <= endISO;
}

export interface ParsedVirtualId {
  isVirtual: boolean;
  baseTaskId: string;
  occurrenceDate: string | null; // YYYY-MM-DD if virtual
}

/**
 * Parses Tweek virtual occurrence IDs of the format `<taskId>_yyyyMMdd`.
 */
export function parseVirtualTaskId(taskId: string): ParsedVirtualId {
  const match = /^(.+)_(\d{4})(\d{2})(\d{2})$/.exec(taskId);
  if (!match) {
    return {
      isVirtual: false,
      baseTaskId: taskId,
      occurrenceDate: null,
    };
  }
  const [, baseTaskId, yyyy, mm, dd] = match;
  return {
    isVirtual: true,
    baseTaskId,
    occurrenceDate: `${yyyy}-${mm}-${dd}`,
  };
}

/**
 * Parses inline tokens in Quick Add text such as:
 * "Prepare slides @tomorrow #pink" -> { cleanText: "Prepare slides", date: "...", color: "pink" }
 */
export function parseQuickAddInput(
  rawText: string,
  explicitDate?: string,
  referenceDate: Date = new Date(),
): {
  cleanText: string;
  date: string | null;
  color?: string;
} {
  let text = rawText.trim();
  const todayISO = getTodayISO(referenceDate);
  let resolvedDate: string | null = todayISO;
  let resolvedColor: string | undefined;

  // Extract #color token
  const colorMatch =
    /(?:^|\s)#(blank|pink|yellowish|black|grey|cornflower|mango|greenish|lilac)\b/i.exec(
      text,
    );
  if (colorMatch) {
    resolvedColor = colorMatch[1].toLowerCase();
    text = text.replace(colorMatch[0], " ").trim();
  }

  // Extract @date token
  const dateTokenMatch =
    /(?:^|\s)@(today|tomorrow|nextweek|someday|\d{4}-\d{2}-\d{2})\b/i.exec(
      text,
    );
  if (dateTokenMatch) {
    const token = dateTokenMatch[1].toLowerCase();
    if (token === "today") {
      resolvedDate = todayISO;
    } else if (token === "tomorrow") {
      resolvedDate = addDaysISO(todayISO, 1);
    } else if (token === "nextweek") {
      resolvedDate = addDaysISO(todayISO, 7);
    } else if (token === "someday") {
      resolvedDate = null;
    } else {
      resolvedDate = token;
    }
    text = text.replace(dateTokenMatch[0], " ").trim();
  }

  if (explicitDate && explicitDate.trim()) {
    const cleanExplicit = explicitDate.trim().toLowerCase();
    if (cleanExplicit === "today") {
      resolvedDate = todayISO;
    } else if (cleanExplicit === "tomorrow") {
      resolvedDate = addDaysISO(todayISO, 1);
    } else if (cleanExplicit === "someday") {
      resolvedDate = null;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(cleanExplicit)) {
      resolvedDate = cleanExplicit;
    }
  }

  return {
    cleanText: text.replace(/\s+/g, " ").trim() || rawText.trim(),
    date: resolvedDate,
    color: resolvedColor,
  };
}
