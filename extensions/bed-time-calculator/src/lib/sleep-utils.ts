/**
 * Sleep calculation utilities based on 90-minute sleep cycles.
 */

import { Color, Icon } from "@raycast/api";
import * as chrono from "chrono-node";

export type Minutes = number; // 0..1439 (minutes since midnight)
export type Meridiem = "AM" | "PM";

export interface Time12h {
  hour: number; // 1..12
  minute: number; // 0..59
  ampm: Meridiem;
}

export interface SleepTime extends Time12h {
  cycles: number;
  totalMinutes: number; // Total sleep duration in minutes
  isRecommended: boolean;
}

// Default sleep parameters
export const FALL_ASLEEP_BUFFER = 15; // minutes
export const CYCLE_LENGTH = 90; // minutes
export const DEFAULT_CYCLES = [3, 4, 5, 6];
export const RECOMMENDED_CYCLES = [5, 6];

/**
 * Convert 12-hour time to minutes since midnight.
 * Returns null for invalid input instead of throwing.
 */
export function toMinutes(h: number, m: number, ampm: Meridiem): Minutes | null {
  if (h < 1 || h > 12 || m < 0 || m > 59) {
    return null;
  }

  let hh = h % 12;
  if (ampm === "PM") hh += 12;
  return hh * 60 + m;
}

/**
 * Convert minutes since midnight to 12-hour time.
 */
export function fromMinutes(total: Minutes): Time12h {
  // Normalize to 0-1439 range
  total = ((total % 1440) + 1440) % 1440;

  const hh24 = Math.floor(total / 60);
  const mm = total % 60;
  const ampm: Meridiem = hh24 >= 12 ? "PM" : "AM";

  let hh12 = hh24 % 12;
  if (hh12 === 0) hh12 = 12;

  return { hour: hh12, minute: mm, ampm };
}

/**
 * Calculate optimal bedtimes for a given wake-up time.
 */
export function bedtimesForWake(
  wakeH: number,
  wakeM: number,
  wakeAMPM: Meridiem,
  fallAsleep = FALL_ASLEEP_BUFFER,
  cycleLen = CYCLE_LENGTH,
  cycles = DEFAULT_CYCLES,
): SleepTime[] {
  const wake = toMinutes(wakeH, wakeM, wakeAMPM);
  if (wake === null) return [];

  return cycles.map((n) => {
    const sleepDuration = n * cycleLen;
    const t = wake - (fallAsleep + sleepDuration);
    const time = fromMinutes(t);

    return {
      ...time,
      cycles: n,
      totalMinutes: sleepDuration,
      isRecommended: RECOMMENDED_CYCLES.includes(n),
    };
  });
}

/**
 * Calculate optimal wake times for a given sleep time.
 */
export function wakeTimesForSleep(
  sleepH: number,
  sleepM: number,
  sleepAMPM: Meridiem,
  fallAsleep = FALL_ASLEEP_BUFFER,
  cycleLen = CYCLE_LENGTH,
  cycles = DEFAULT_CYCLES,
): SleepTime[] {
  const sleep = toMinutes(sleepH, sleepM, sleepAMPM);
  if (sleep === null) return [];

  return cycles.map((n) => {
    const sleepDuration = n * cycleLen;
    const t = sleep + fallAsleep + sleepDuration;
    const time = fromMinutes(t);

    return {
      ...time,
      cycles: n,
      totalMinutes: sleepDuration,
      isRecommended: RECOMMENDED_CYCLES.includes(n),
    };
  });
}

/**
 * Format a Time12h object for display.
 */
export function formatTime(time: Time12h): string {
  const minuteStr = time.minute.toString().padStart(2, "0");
  return `${time.hour}:${minuteStr} ${time.ampm}`;
}

/**
 * Format duration in minutes to human-readable string.
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Parse a time string input into components using chrono-node.
 * Supports natural language time formats like "7:30 AM", "noon", "half past 7", etc.
 */
export function parseTimeInput(input: string): { hour: number; minute: number; ampm: Meridiem } | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // Handle special keywords explicitly for consistency
  if (trimmed === "noon" || trimmed === "12p" || trimmed === "12 p" || trimmed === "midday") {
    return { hour: 12, minute: 0, ampm: "PM" };
  }
  if (trimmed === "midnight" || trimmed === "12a" || trimmed === "12 a") {
    return { hour: 12, minute: 0, ampm: "AM" };
  }

  // Use chrono-node for all other parsing
  const results = chrono.parse(trimmed);
  if (results.length === 0) return null;

  const date = results[0].start.date();
  const hour24 = date.getHours();
  const minute = date.getMinutes();

  const ampm: Meridiem = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  return { hour: hour12, minute, ampm };
}

/**
 * Get current time as Time12h.
 */
export function getCurrentTime(): Time12h {
  const now = new Date();
  const hour24 = now.getHours();
  const minute = now.getMinutes();

  const ampm: Meridiem = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  return { hour: hour12, minute, ampm };
}

/**
 * Get sleep quality based on number of cycles.
 */
export function getSleepQuality(cycles: number): {
  label: string;
  color: Color;
  icon: Icon;
} {
  if (cycles >= 6) return { label: "Optimal", color: Color.Green, icon: Icon.Star };
  if (cycles === 5) return { label: "Great", color: Color.Blue, icon: Icon.Star };
  if (cycles === 4) return { label: "Good", color: Color.Yellow, icon: Icon.Circle };
  if (cycles === 3) return { label: "Light", color: Color.Orange, icon: Icon.Circle };
  if (cycles === 2) return { label: "Nap", color: Color.Red, icon: Icon.Circle };
  return { label: "Minimal", color: Color.Red, icon: Icon.ExclamationMark };
}
