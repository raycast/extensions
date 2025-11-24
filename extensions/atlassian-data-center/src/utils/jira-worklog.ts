import dayjs from "dayjs";
import { JIRA_WORKLOG_RANGE } from "@/constants";

/**
 * Normalize time input to standardized format: 1h 30m, 30m, or 1h
 * Examples:
 *   "1" -> "1h"
 *   "1.5" -> "1h 30m"
 *   "30m" -> "30m"
 *   "30" -> "30h"
 *   "1h" -> "1h"
 *   "1.5h" -> "1h 30m"
 *   "1h 30.5m" -> "1h 31m"
 *   "1h 30" -> "1h 30m"
 *   "1 30" -> "130h"
 */
export function normalizeWorkedTime(timeStr: string): string {
  let processed = timeStr.toLowerCase().replace(/\s+/g, "");

  if (!processed.endsWith("h") && !processed.endsWith("m")) {
    const unit = processed.includes("h") ? "m" : "h";
    processed += unit;
  }

  const hourMinuteMatch = processed.match(/^(\d+(?:\.\d+)?)h(\d+(?:\.\d+)?)m$/);
  const hourOnlyMatch = processed.match(/^(\d+(?:\.\d+)?)h$/);
  const minuteOnlyMatch = processed.match(/^(\d+(?:\.\d+)?)m$/);

  let totalSeconds = 0;

  if (hourMinuteMatch) {
    // Has both hours and minutes
    const hours = parseFloat(hourMinuteMatch[1]);
    const minutes = parseFloat(hourMinuteMatch[2]);
    totalSeconds = hours * 3600 + minutes * 60;
  } else if (hourOnlyMatch) {
    // Hours only
    const hours = parseFloat(hourOnlyMatch[1]);
    totalSeconds = hours * 3600;
  } else if (minuteOnlyMatch) {
    // Minutes only
    const minutes = parseFloat(minuteOnlyMatch[1]);
    totalSeconds = minutes * 60;
  } else {
    // Return original if no match
    return timeStr.trim();
  }

  // Convert to hours and minutes, rounding seconds
  const totalSecondsRounded = Math.round(totalSeconds);
  const hours = Math.floor(totalSecondsRounded / 3600);
  const minutes = Math.round((totalSecondsRounded % 3600) / 60);

  let formattedTime = "";
  if (hours > 0) {
    formattedTime += `${hours}h `;
  }
  if (minutes > 0) {
    formattedTime += `${minutes}m`;
  }

  return formattedTime.trim() || "0h";
}

export function formatWorkedTimeToSeconds(timeStr: string): number {
  const timeStrLower = timeStr.toLowerCase().trim();

  // Handle normalized formats: "1h 30m", "1h", "30m"
  const hourMatch = timeStrLower.match(/(\d+)\s*h/);
  const minuteMatch = timeStrLower.match(/(\d+)\s*m/);

  let totalSeconds = 0;

  if (hourMatch) {
    totalSeconds += parseInt(hourMatch[1], 10) * 3600;
  }

  if (minuteMatch) {
    totalSeconds += parseInt(minuteMatch[1], 10) * 60;
  }

  return totalSeconds;
}

/**
 * Convert seconds to hours and minutes format
 * Examples:
 *   3661 -> "1h 1m"
 *   3600 -> "1h"
 *   1800 -> "30m"
 *   0 -> "0h"
 */
export function formatSecondsToWorkedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  let formattedTime = "";
  if (hours > 0) {
    formattedTime += `${hours}h `;
  }
  if (minutes > 0) {
    formattedTime += `${minutes}m`;
  }

  return formattedTime.trim() || "0h";
}

export function getDateRange(rangeType: string): { from: string; to: string } {
  const today = dayjs();

  switch (rangeType) {
    case JIRA_WORKLOG_RANGE.DAILY:
      return {
        from: today.format("YYYY-MM-DD"),
        to: today.format("YYYY-MM-DD"),
      };
    case JIRA_WORKLOG_RANGE.MONTHLY:
      return {
        from: today.startOf("month").format("YYYY-MM-DD"),
        to: today.format("YYYY-MM-DD"),
      };
    case JIRA_WORKLOG_RANGE.WEEKLY:
    default:
      return {
        from: today.startOf("week").format("YYYY-MM-DD"),
        to: today.format("YYYY-MM-DD"),
      };
  }
}
