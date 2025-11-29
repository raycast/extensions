import { NormalizedTimeEntry, formatDuration } from "../bamboo/api";
import { timeFormatter } from "./time";

export function formatTimeRange(entry: NormalizedTimeEntry): string {
  const startTime = entry.start ? timeFormatter.format(entry.start) : undefined;
  const endTime = entry.end ? timeFormatter.format(entry.end) : undefined;

  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }

  if (startTime && !endTime) {
    return `${startTime} - ...`;
  }

  return "Time not available";
}

export function formatEntryLine(
  entry: NormalizedTimeEntry,
  label?: string,
): string {
  const startTime = entry.start ? timeFormatter.format(entry.start) : undefined;
  const endTime = entry.end ? timeFormatter.format(entry.end) : undefined;
  const duration = entry.durationMs
    ? formatDuration(entry.durationMs)
    : undefined;

  const parts: string[] = [];
  if (startTime) {
    parts.push(startTime);
  }
  if (endTime) {
    parts.push(endTime);
  } else {
    parts.push("...");
  }

  const prefix = label ? `${label}: ` : "";
  const suffix = duration ? ` (${duration})` : "";

  return `${prefix}${parts.join(" - ")}${suffix}`;
}

export function entryDurationMs(entry: NormalizedTimeEntry): number {
  if (entry.start) {
    if (entry.end) {
      return Math.max(0, entry.end.getTime() - entry.start.getTime());
    }
    return Math.max(0, Date.now() - entry.start.getTime());
  }

  return entry.durationMs ?? 0;
}
