import { UTCDate } from "@date-fns/utc";
import { Color, Icon, getPreferenceValues } from "@raycast/api";
import * as chrono from "chrono-node";
import { addDays, format, isThisYear, isBefore, formatISO, isSameDay } from "date-fns";

import type { Location, Priority, Reminder } from "./hooks/useData";

export function isDayFirst(preference?: string): boolean {
  if (preference) {
    return preference === "dmy";
  }
  try {
    const prefs = getPreferenceValues<Preferences>();
    return prefs?.dateFormat === "dmy";
  } catch {
    return false;
  }
}

export function parseChronoDate(text: string, preference?: string) {
  const dayFirst = isDayFirst(preference);
  const parser = dayFirst ? chrono.en.GB : chrono.en;
  return parser.parse(text);
}

export function isFullDay(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function formatReminderTime(reminder?: { dueDate?: string | null } | null): string {
  if (!reminder?.dueDate || isFullDay(reminder.dueDate)) {
    return "";
  }

  const date = new Date(reminder.dueDate);
  if (isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getDateString(date: string) {
  return isFullDay(date) ? date : formatISO(date, { representation: "date" });
}

export function getTodayInLocalTime() {
  return formatISO(new Date(), { representation: "date" });
}

export function isOverdue(date: string) {
  return isBefore(date, isFullDay(date) ? getTodayInLocalTime() : new Date());
}

export function isToday(date: string) {
  return isSameDay(date, isFullDay(date) ? getTodayInLocalTime() : new Date());
}

export function isTomorrow(date: string) {
  const today = isFullDay(date) ? getTodayInLocalTime() : new Date();
  return isSameDay(date, addDays(today, 1));
}

export function displayDueDate(date: string) {
  if (isToday(date)) {
    return "Today";
  }

  if (isTomorrow(date)) {
    return "Tomorrow";
  }

  const today = getTodayInLocalTime();
  const nextWeek = addDays(today, 7);

  if (isBefore(date, nextWeek)) {
    return format(new UTCDate(date), "eeee");
  }

  if (isThisYear(date)) {
    return format(new UTCDate(date), "dd MMMM");
  }

  return format(new UTCDate(date), "dd MMMM yyy");
}

export function getPriorityIcon(priority: Priority) {
  if (priority === "high") {
    return {
      source: Icon.Exclamationmark3,
      tintColor: Color.Red,
    };
  }

  if (priority === "medium") {
    return {
      source: Icon.Exclamationmark2,
      tintColor: Color.Yellow,
    };
  }

  if (priority === "low") {
    return {
      source: Icon.Exclamationmark,
      tintColor: Color.Blue,
    };
  }

  return undefined;
}

export function getLocationDescription(location: Location) {
  const radius = Intl.NumberFormat("en", { style: "unit", unit: "meter", unitDisplay: "long" }).format(
    location.radius ? location.radius : 100,
  );

  return `${location.proximity === "enter" ? "Arriving at:" : "Leaving:"} ${location.address} (within ${radius})`;
}

export function truncate(str: string, maxLength = 45): string {
  const characters = Array.from(str);

  if (characters.length <= maxLength) {
    return str;
  }

  return characters.slice(0, maxLength).join("") + "…";
}

export function getIntervalValidationError(interval?: string): string | undefined {
  if (!interval) return "Interval is required";
  if (isNaN(Number(interval))) return "Interval must be a number";
  if ((interval as unknown as number) < 1) return "Must be greater than 0";
}

export function getAttachedUrls(reminder: Reminder): string[] {
  if (!reminder.attachedUrls || !Array.isArray(reminder.attachedUrls)) {
    return [];
  }
  return reminder.attachedUrls.filter(Boolean);
}

export function parseTags(input?: string | string[]): string[] {
  if (!input) {
    return [];
  }

  const rawTags = Array.isArray(input) ? input : input.split(/[,\s]+/);
  const normalizedTags: string[] = [];

  for (const raw of rawTags) {
    const trimmed = raw.trim().replace(/^#+/, "");
    if (trimmed && !normalizedTags.includes(trimmed)) {
      normalizedTags.push(trimmed);
    }
  }

  return normalizedTags;
}

export function formatTags(tags?: string | string[]): string {
  const parsed = parseTags(tags);
  if (parsed.length === 0) {
    return "";
  }
  return parsed.map((tag) => `#${tag}`).join(" ");
}

export function extractTagsFromNotes(notes?: string): { notes: string; tags: string[] } {
  if (!notes) {
    return { notes: "", tags: [] };
  }

  const trimmed = notes.trimEnd();
  const lines = trimmed.split("\n");
  const lastLine = lines[lines.length - 1].trim();

  // If the last line consists only of hashtags (e.g. "#work #urgent")
  if (lastLine.length > 0 && /^#[a-zA-Z0-9_\u0080-\uFFFF-]+(?:\s+#[a-zA-Z0-9_\u0080-\uFFFF-]+)*$/.test(lastLine)) {
    const rawTags = lastLine.split(/\s+/).map((t) => t.replace(/^#/, ""));
    const remainingLines = lines.slice(0, -1);
    while (remainingLines.length > 0 && remainingLines[remainingLines.length - 1].trim() === "") {
      remainingLines.pop();
    }
    return {
      notes: remainingLines.join("\n"),
      tags: rawTags,
    };
  }

  return { notes, tags: [] };
}

export function applyTagsToNotes(notes?: string, tags?: string | string[]): string | undefined {
  const cleanNotes = extractTagsFromNotes(notes).notes;
  const formatted = formatTags(tags);

  if (!formatted) {
    return cleanNotes.length > 0 ? cleanNotes : undefined;
  }

  if (cleanNotes && cleanNotes.trim().length > 0) {
    return `${cleanNotes.trim()}\n\n${formatted}`;
  }

  return formatted;
}

export function extractTagsFromText(text: string): { title: string; tags: string[] } {
  const tags: string[] = [];

  // Match real quoted spans ("...", “...”, or paired '...' that are not inside words like don't or John's)
  const parts = text.split(/("[^"]*"|“[^“”]*”|(?<=^|\s)'[^']*'(?=\s|$))/g);
  const processedParts = parts.map((part) => {
    if (
      (part.startsWith('"') && part.endsWith('"')) ||
      (part.startsWith("“") && part.endsWith("”")) ||
      (part.startsWith("'") && part.endsWith("'"))
    ) {
      return part;
    }
    return part.replace(/(?:^|\s|,+)#([a-zA-Z0-9_\u0080-\uFFFF-]+)/g, (match, tag) => {
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
      return "";
    });
  });

  return {
    title: processedParts
      .join("")
      .replace(/,\s*,+/g, ",")
      .replace(/[,\s]+$/, "")
      .replace(/^\s*[,\s]+/, "")
      .replace(/\s+/g, " ")
      .trim(),
    tags,
  };
}
