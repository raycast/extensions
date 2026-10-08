/**
 * Hierarchical grouping of Tesla events by day, month, and year for list navigation.
 */

import { formatEventTimeOnly } from "./format-event";
import type { TeslaEvent } from "../types";

/** Events recorded on one calendar day. */
export type EventDayGroup = {
  readonly dayKey: string;
  readonly label: string;
  readonly events: readonly TeslaEvent[];
  readonly eventCount: number;
  readonly totalSegments: number;
  readonly totalGaps: number;
};

/**
 * Extracts `YYYY-MM-DD` from a Tesla event folder name.
 *
 * @param folderName - Folder basename (`YYYY-MM-DD_HH-mm-ss`).
 * @returns Day key or `undefined` when the prefix does not match.
 */
export function getEventDayKey(folderName: string): string | undefined {
  const match = /^(\d{4}-\d{2}-\d{2})_/.exec(folderName);
  return match?.[1];
}

/**
 * Extracts the four-digit year from an event folder name.
 *
 * @param folderName - Folder basename.
 * @returns Year string or `undefined` when day key is missing.
 */
export function getEventYearKey(folderName: string): string | undefined {
  const dayKey = getEventDayKey(folderName);
  return dayKey?.slice(0, 4);
}

/**
 * Extracts `YYYY-MM` from an event folder name.
 *
 * @param folderName - Folder basename.
 * @returns Month key or `undefined` when day key is missing.
 */
export function getEventMonthKey(folderName: string): string | undefined {
  const dayKey = getEventDayKey(folderName);
  return dayKey?.slice(0, 7);
}

/** Events grouped under one calendar month with nested day groups. */
export type EventMonthGroup = {
  readonly monthKey: string;
  readonly label: string;
  readonly events: readonly TeslaEvent[];
  readonly eventCount: number;
  readonly dayCount: number;
  readonly totalSegments: number;
  readonly days: readonly EventDayGroup[];
};

/** Events grouped under one year with nested month and day groups. */
export type EventYearGroup = {
  readonly yearKey: string;
  readonly label: string;
  readonly events: readonly TeslaEvent[];
  readonly eventCount: number;
  readonly dayCount: number;
  readonly monthCount: number;
  readonly totalSegments: number;
  readonly months: readonly EventMonthGroup[];
};

/**
 * Parses a `YYYY-MM-DD` day key into a local `Date`.
 *
 * @param dayKey - `YYYY-MM-DD` string.
 * @returns Parsed date, or `undefined` when the key doesn't match the expected format.
 */
function parseDayKeyDate(dayKey: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) {
    return undefined;
  }

  const [, year, month, day] = match;
  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
}

/**
 * Formats a day key for full list labels.
 *
 * @param dayKey - `YYYY-MM-DD` string.
 * @returns Localized date or the raw key when unparsable.
 */
export function formatEventDayLabel(dayKey: string): string {
  const date = parseDayKeyDate(dayKey);
  if (!date) {
    return dayKey;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Formats a day key without year for compact subtitles.
 *
 * @param dayKey - `YYYY-MM-DD` string.
 * @returns Short month/day label or the raw key.
 */
export function formatDayGroupShortLabel(dayKey: string): string {
  const date = parseDayKeyDate(dayKey);
  if (!date) {
    return dayKey;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Formats a month key for list section titles.
 *
 * @param monthKey - `YYYY-MM` string.
 * @returns Localized month and year or the raw key.
 */
export function formatEventMonthLabel(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    return monthKey;
  }

  const [, year, month] = match;
  if (!year || !month) {
    return monthKey;
  }

  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Formats a year key for list section titles.
 *
 * @param yearKey - Four-digit year string.
 * @returns The year key unchanged.
 */
export function formatEventYearLabel(yearKey: string): string {
  return yearKey;
}

function buildDayGroup(dayKey: string, events: readonly TeslaEvent[]): EventDayGroup {
  return {
    dayKey,
    label: formatEventDayLabel(dayKey),
    events,
    eventCount: events.length,
    totalSegments: events.reduce((sum, event) => sum + event.totalSegments, 0),
    totalGaps: events.reduce((sum, event) => sum + event.totalGaps, 0),
  };
}

/**
 * Groups events by calendar day, newest days first; events within a day newest first.
 *
 * @param events - Flat event list.
 * @returns Sorted day groups.
 */
export function groupEventsByDay(events: readonly TeslaEvent[]): EventDayGroup[] {
  const grouped = new Map<string, TeslaEvent[]>();

  for (const event of events) {
    const dayKey = getEventDayKey(event.folderName) ?? event.folderName;
    const bucket = grouped.get(dayKey);
    if (bucket) {
      bucket.push(event);
    } else {
      grouped.set(dayKey, [event]);
    }
  }

  return [...grouped.entries()]
    .sort(([leftKey], [rightKey]) => rightKey.localeCompare(leftKey))
    .map(([dayKey, dayEvents]) => {
      const sortedEvents = [...dayEvents].sort((left, right) => right.folderName.localeCompare(left.folderName));
      return buildDayGroup(dayKey, sortedEvents);
    });
}

function buildMonthGroup(monthKey: string, days: readonly EventDayGroup[]): EventMonthGroup {
  const events = days.flatMap((day) => day.events);
  return {
    monthKey,
    label: formatEventMonthLabel(monthKey),
    events,
    eventCount: events.length,
    dayCount: days.length,
    totalSegments: events.reduce((sum, event) => sum + event.totalSegments, 0),
    days,
  };
}

/**
 * Groups day groups by calendar month, newest months first.
 *
 * @param dayGroups - Day groups from {@link groupEventsByDay}.
 * @returns Sorted month groups.
 */
export function groupDayGroupsByMonth(dayGroups: readonly EventDayGroup[]): EventMonthGroup[] {
  const grouped = new Map<string, EventDayGroup[]>();

  for (const dayGroup of dayGroups) {
    const monthKey = dayGroup.dayKey.slice(0, 7);
    const bucket = grouped.get(monthKey);
    if (bucket) {
      bucket.push(dayGroup);
    } else {
      grouped.set(monthKey, [dayGroup]);
    }
  }

  return [...grouped.entries()]
    .sort(([leftKey], [rightKey]) => rightKey.localeCompare(leftKey))
    .map(([monthKey, days]) => buildMonthGroup(monthKey, days));
}

function buildYearGroup(yearKey: string, months: readonly EventMonthGroup[]): EventYearGroup {
  const events = months.flatMap((month) => month.events);
  const dayCount = months.reduce((sum, month) => sum + month.dayCount, 0);
  return {
    yearKey,
    label: formatEventYearLabel(yearKey),
    events,
    eventCount: events.length,
    dayCount,
    monthCount: months.length,
    totalSegments: events.reduce((sum, event) => sum + event.totalSegments, 0),
    months,
  };
}

/**
 * Groups events by year with nested month and day groups, newest years first.
 *
 * @param events - Flat event list.
 * @returns Sorted year groups containing months and days.
 */
export function groupEventsByYear(events: readonly TeslaEvent[]): EventYearGroup[] {
  const dayGroups = groupEventsByDay(events);
  const grouped = new Map<string, EventDayGroup[]>();

  for (const dayGroup of dayGroups) {
    const yearKey = dayGroup.dayKey.slice(0, 4);
    const bucket = grouped.get(yearKey);
    if (bucket) {
      bucket.push(dayGroup);
    } else {
      grouped.set(yearKey, [dayGroup]);
    }
  }

  return [...grouped.entries()]
    .sort(([leftKey], [rightKey]) => rightKey.localeCompare(leftKey))
    .map(([yearKey, days]) => {
      const months = groupDayGroupsByMonth(days);
      return buildYearGroup(yearKey, months);
    });
}

/**
 * Builds a short subtitle for a year group (day count).
 *
 * @param group - Year group.
 * @returns Pluralized day count string.
 */
export function formatYearGroupSubtitle(group: EventYearGroup): string {
  return `${group.dayCount} day${group.dayCount !== 1 ? "s" : ""}`;
}

/**
 * Builds a short subtitle for a month group (day count).
 *
 * @param group - Month group.
 * @returns Pluralized day count string.
 */
export function formatMonthGroupSubtitle(group: EventMonthGroup): string {
  return `${group.dayCount} day${group.dayCount !== 1 ? "s" : ""}`;
}

/**
 * Builds detail markdown for a year group drill-down.
 *
 * @param group - Year group.
 * @returns Markdown with counts and navigation hint.
 */
export function formatYearGroupDetailMarkdown(group: EventYearGroup): string {
  return `### ${group.label}\n\n**Months:** ${group.monthCount}\n\n**Days:** ${group.dayCount}\n\n**Events:** ${group.eventCount}\n\n**Clip segments:** ${group.totalSegments}\n\nPress **Enter** to browse days grouped by month.`;
}

/**
 * Builds a short subtitle for a day group (event count).
 *
 * @param group - Day group.
 * @returns Pluralized event count string.
 */
export function formatDayGroupSubtitle(group: EventDayGroup): string {
  return `${group.eventCount} event${group.eventCount !== 1 ? "s" : ""}`;
}

/**
 * Builds detail markdown for a day group drill-down.
 *
 * @param group - Day group.
 * @returns Markdown with counts, gap note, and navigation hint.
 */
export function formatDayGroupDetailMarkdown(group: EventDayGroup): string {
  const gapNote =
    group.totalGaps > 0
      ? `\n\n**Timeline gaps:** ${group.totalGaps} across this day.`
      : "\n\nNo timeline gaps detected.";
  return `### ${group.label}\n\n**Events:** ${group.eventCount}\n\n**Clip segments:** ${group.totalSegments}${gapNote}\n\nPress **Enter** to review individual recordings from this day.`;
}

/**
 * Formats the time portion of an event folder for nested list rows.
 *
 * @param folderName - Event folder basename.
 * @returns Localized time via {@link formatEventTimeOnly}.
 */
export function formatEventTimeLabel(folderName: string): string {
  return formatEventTimeOnly(folderName);
}
