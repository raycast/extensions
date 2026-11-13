/** ECMAScript TimeClip: timestamps beyond ±100,000,000 days from the epoch are invalid Dates. */
const MAX_ABS_TIME_MS = 8.64e15;

/** Generous upper bound for a punch-clock work period; well within the Date range. */
export const MAX_HOURS = 9999;

/** Generous upper bound for break length; well within the Date range. */
export const MAX_BREAK_MINUTES = 99_999;

const MAX_WORK_MINUTES = MAX_HOURS * 60 + 59;

export function parseWholeNumber(value: string | undefined): number | undefined {
  const trimmed = (value ?? "").trim();
  if (trimmed === "") return 0;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return undefined;
  return parsed;
}

export function isValidTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= MAX_ABS_TIME_MS;
}

export function validateHours(value: string | undefined): string | undefined {
  const hours = parseWholeNumber(value);
  if (hours === undefined) return "Enter a whole number of hours";
  if (hours > MAX_HOURS) return `Hours must be between 0 and ${MAX_HOURS}`;
}

export function validateMinutes(value: string | undefined): string | undefined {
  const minutes = parseWholeNumber(value);
  if (minutes === undefined) return "Enter a whole number of minutes";
  if (minutes > 59) return "Minutes must be between 0 and 59";
}

export function validateBreakMinutes(value: string | undefined): string | undefined {
  const breakMinutes = parseWholeNumber(value);
  if (breakMinutes === undefined) return "Enter a whole number of minutes";
  if (breakMinutes > MAX_BREAK_MINUTES) return `Break must be between 0 and ${MAX_BREAK_MINUTES} minutes`;
}

export function resolveTimerEndTime(startTime: number, totalMinutes: number, breakMinutes: number): number {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0 || !Number.isFinite(breakMinutes) || breakMinutes < 0) {
    throw new Error("Invalid timer duration");
  }

  if (totalMinutes > MAX_WORK_MINUTES || breakMinutes > MAX_BREAK_MINUTES) {
    throw new Error("Invalid timer duration");
  }

  const durationMs = (totalMinutes + breakMinutes) * 60_000;
  const endTime = startTime + durationMs;
  if (!Number.isFinite(durationMs) || !isValidTimestamp(endTime)) {
    throw new Error("Invalid timer duration");
  }
  return endTime;
}
