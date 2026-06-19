import { Color } from "@raycast/api";
import { Course, DayOfWeek, ScheduleSlot } from "./types";
import { DAYS_OF_WEEK, COLOR_DEFINITIONS } from "./constants";

const RAYCAST_COLOR_MAP: Record<string, Color> = Object.fromEntries(COLOR_DEFINITIONS.map((c) => [c.value, c.raycast]));
const COLOR_HEX_MAP: Record<string, string> = Object.fromEntries(COLOR_DEFINITIONS.map((c) => [c.value, c.hex]));

export function resolveRaycastColor(colorName: string | undefined): Color | string | undefined {
  if (!colorName) return undefined;
  const mapped = RAYCAST_COLOR_MAP[colorName.toLowerCase()];
  if (mapped) {
    // For colors that map to a semantic color like SecondaryText, return the hex instead
    const hex = COLOR_HEX_MAP[colorName.toLowerCase()];
    if (hex && mapped === Color.SecondaryText) {
      return hex;
    }
    return mapped;
  }
  // Pass hex strings through — Raycast accepts them as tintColor
  if (/^#[0-9A-Fa-f]{6}$/.test(colorName)) return colorName;
  return undefined;
}

export interface ScheduleOccurrence {
  course: Course;
  slot: ScheduleSlot;
  day: DayOfWeek;
}

export function parseTime(hhmm: string): number {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return NaN;
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatTime(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function getTodayName(): DayOfWeek {
  const dayNames: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return dayNames[new Date().getDay()];
}

export function getCurrentTime(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getSchedulesForDay(courses: Course[], day: DayOfWeek): ScheduleOccurrence[] {
  const occurrences: ScheduleOccurrence[] = [];

  for (const course of courses) {
    for (const slot of course.schedules) {
      if (slot.days.includes(day)) {
        occurrences.push({ course, slot, day });
      }
    }
  }

  return occurrences.sort((a, b) => parseTime(a.slot.startTime) - parseTime(b.slot.startTime));
}

export function getNextSchedule(courses: Course[]): ScheduleOccurrence | null {
  const today = getTodayName();
  const now = getCurrentTime();
  const todaySchedules = getSchedulesForDay(courses, today);

  for (const occurrence of todaySchedules) {
    if (parseTime(occurrence.slot.endTime) > parseTime(now)) {
      return occurrence;
    }
  }

  return null;
}

export function getSchedulesGroupedByDay(courses: Course[]): Map<DayOfWeek, ScheduleOccurrence[]> {
  const grouped = new Map<DayOfWeek, ScheduleOccurrence[]>();

  for (const day of DAYS_OF_WEEK) {
    grouped.set(day, []);
  }

  for (const course of courses) {
    for (const slot of course.schedules) {
      for (const day of slot.days) {
        const daySchedules = grouped.get(day);
        if (daySchedules) {
          daySchedules.push({ course, slot, day });
        }
      }
    }
  }

  for (const day of DAYS_OF_WEEK) {
    const daySchedules = grouped.get(day);
    if (daySchedules) {
      daySchedules.sort((a, b) => parseTime(a.slot.startTime) - parseTime(b.slot.startTime));
    }
  }

  return grouped;
}

export function purgeExpiredEphemeral(courses: Course[]): Course[] {
  const today = new Date().toISOString().split("T")[0];

  return courses.filter((course) => {
    if (!course.ephemeral) {
      return true;
    }
    if (!course.expiresAt) {
      return true;
    }
    return course.expiresAt >= today;
  });
}

/**
 * Returns true if the string is a valid 24-hour time in H:MM or HH:MM format.
 * Valid range: 0:00 – 23:59
 */
export function isValidTime(hhmm: string): boolean {
  return /^([01]?\d|2[0-3]):([0-5]\d)$/.test(hhmm);
}
