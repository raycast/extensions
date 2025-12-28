import { DayLog, Frequency } from "../types/habit";
import { isHabitDueOnDate } from "./frequency";
import {
  getToday_YYYYMMDD,
  getYesterday_YYYYMMDD,
  parseDate_YYYYMMDD,
} from "./date";
import { subDays, format } from "date-fns";

export function calculateStreak(
  logs: Record<string, DayLog>,
  frequency: Frequency
): number {
  const today = getToday_YYYYMMDD();
  const yesterday = getYesterday_YYYYMMDD();

  if (!logs[today]) {
    // If today is not logged, we check from yesterday to see if streak is alive
    // check yesterday logic implied
  }

  // If yesterday is also missing (and today missing), streak is broken?
  // Wait, if I skipped yesterday, it should still be alive.
  // We need to find the "latest connected valid block".

  // Algorithm: Start from Today. Walk backwards.
  // If Today is Empty -> Treat as "Not broken yet", start check from Yesterday.
  // If Today is Completed -> Streak includes today. Count = 1. Next check Yesterday.
  // If Today is Skipped -> Streak doesn't increment, but doesn't break. Next check Yesterday.

  // Refined Algorithm:
  // 1. Find the "anchor" date. If Today is logged (Completed/Skipped), start there.
  //    If Today is NOT logged, start Yesterday.

  let streak = 0;
  let dateStr = today;

  // Special case: If today is not logged, we don't count it as a break, but we don't count it towards streak either.
  // However, if Yesterday was ALSO missed (not skipped), then streak is 0.

  if (!logs[today]) {
    dateStr = yesterday;
  }

  // Loop backwards
  // Max validation to avoid infinite loops (e.g. 10 years)
  for (let i = 0; i < 365 * 5; i++) {
    const log = logs[dateStr];
    const isDue = isHabitDueOnDate(frequency, dateStr);

    if (!log) {
      // No log found for this date
      if (!isDue) {
        // Not due today - skip this day, don't break streak
        // Move to previous day and continue
      } else {
        // Was due but not logged - streak is broken
        break;
      }
    } else {
      // Log exists
      if (log.status === "completed") {
        streak++;
      }
      // If skipped, don't increment but don't break either
    }

    // Move to previous day
    const prevDate = subDays(parseDate_YYYYMMDD(dateStr), 1);
    dateStr = format(prevDate, "yyyy-MM-dd");
  }

  return streak;
}

export function calculateLongestStreak(
  logs: Record<string, DayLog>,
  frequency: Frequency
): number {
  // Sort dates
  const sortedDates = Object.keys(logs).sort();
  if (sortedDates.length === 0) return 0;

  let maxStreak = 0;
  let tempStreak = 0;
  let prevDateVal = -1; // Timestamp

  for (const dateStr of sortedDates) {
    const log = logs[dateStr];
    const currentDateTimes = parseDate_YYYYMMDD(dateStr).getTime();

    if (prevDateVal === -1) {
      if (log.status === "completed") tempStreak = 1;
      else tempStreak = 0;
      prevDateVal = currentDateTimes;
      maxStreak = Math.max(maxStreak, tempStreak);
      continue;
    }

    const diffDays = Math.round(
      (currentDateTimes - prevDateVal) / (1000 * 3600 * 24)
    );

    if (diffDays === 1) {
      if (log.status === "completed") {
        tempStreak++;
      }
      // If skipped, maintain existing tempStreak
    } else {
      // Gap > 1 day. Check if the gap days were due.
      // If ALL gap days were NOT DUE, we continue.
      // If ANY gap day was DUE, we break (reset to 0 or 1).

      let validGap = true;
      // Check days between prevDateVal and currentDateTimes
      // Start from prev + 1 day
      // End at current - 1 day
      const startGap = new Date(prevDateVal);
      startGap.setDate(startGap.getDate() + 1);

      const endGap = new Date(currentDateTimes);
      // Loop
      const loopDate = startGap;
      while (loopDate < endGap) {
        const checkStr = format(loopDate, "yyyy-MM-dd");
        if (isHabitDueOnDate(frequency, checkStr)) {
          validGap = false;
          break;
        }
        loopDate.setDate(loopDate.getDate() + 1);
      }

      if (validGap) {
        if (log.status === "completed") tempStreak++;
        // else maintain
      } else {
        // Break
        if (log.status === "completed") tempStreak = 1;
        else tempStreak = 0;
      }
    }

    maxStreak = Math.max(maxStreak, tempStreak);
    prevDateVal = currentDateTimes;
  }

  return maxStreak;
}
