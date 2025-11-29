import { NormalizedTimeEntry } from "../bamboo/api";
import { Preferences } from "../preferences";

export function hasWarningsForEntry(
  entry: NormalizedTimeEntry,
  preferences: Preferences,
): boolean {
  const duration = entry.durationMs ?? 0;
  const warnNoBreakHours = toNumberOptional(preferences.warnNoBreakAfterHours);

  if (warnNoBreakHours !== undefined) {
    const limitMs = warnNoBreakHours * 60 * 60 * 1000;
    return duration > limitMs;
  }

  return false;
}

function toNumberOptional(value?: string): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
}
