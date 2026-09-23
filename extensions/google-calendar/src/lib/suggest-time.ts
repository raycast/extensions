export type BusyPeriod = { start: number; end: number };

export type SuggestionInput = {
  timeMin: string;
  timeMax: string;
  durationMinutes: number;
  timeZone: string;
  workDayStart?: string;
  workDayEnd?: string;
  includeWeekends?: boolean;
  incrementMinutes?: number;
  maxSuggestions?: number;
};

export type SuggestedSlot = {
  start: string;
  end: string;
  displayStart: string;
  displayEnd: string;
  timeZone: string;
};

function parseClock(value: string, label: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new Error(`${label} must use 24-hour HH:mm format.`);
  return Number(match[1]) * 60 + Number(match[2]);
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: get("weekday"),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function formatSlot(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

export function mergeBusyPeriods(periods: BusyPeriod[]) {
  const sorted = [...periods].sort((a, b) => a.start - b.start);
  const merged: BusyPeriod[] = [];
  for (const period of sorted) {
    const previous = merged.at(-1);
    if (previous && period.start <= previous.end) previous.end = Math.max(previous.end, period.end);
    else merged.push({ ...period });
  }
  return merged;
}

function prepareSuggestionInput(input: SuggestionInput) {
  const startRange = Date.parse(input.timeMin);
  const endRange = Date.parse(input.timeMax);
  if (Number.isNaN(startRange) || Number.isNaN(endRange) || endRange <= startRange) {
    throw new Error("timeMin and timeMax must be valid RFC3339 datetimes with timeMax after timeMin.");
  }
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
    throw new Error("durationMinutes must be positive.");
  }
  const increment = input.incrementMinutes ?? 15;
  const limit = input.maxSuggestions ?? 10;
  if (!Number.isInteger(increment) || increment < 1 || increment > 1440) {
    throw new Error("incrementMinutes must be a whole number from 1 to 1440.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new Error("maxSuggestions must be a whole number from 1 to 50.");
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input.timeZone }).format();
  } catch {
    throw new Error(`Invalid IANA time zone "${input.timeZone}".`);
  }
  const workStart = parseClock(input.workDayStart ?? "09:00", "workDayStart");
  const workEnd = parseClock(input.workDayEnd ?? "17:00", "workDayEnd");
  if (workEnd <= workStart) throw new Error("workDayEnd must be after workDayStart.");
  return { startRange, endRange, increment, limit, workStart, workEnd };
}

export function validateSuggestionInput(input: SuggestionInput) {
  prepareSuggestionInput(input);
}

export function computeSuggestedSlots(input: SuggestionInput, busyPeriods: BusyPeriod[]): SuggestedSlot[] {
  const { startRange, endRange, increment, limit, workStart, workEnd } = prepareSuggestionInput(input);
  const durationMs = input.durationMinutes * 60000;
  const incrementMs = increment * 60000;
  const busy = mergeBusyPeriods(busyPeriods);
  let candidate = Math.ceil(startRange / incrementMs) * incrementMs;
  const suggestions: SuggestedSlot[] = [];
  while (candidate + durationMs <= endRange && suggestions.length < limit) {
    const candidateEnd = candidate + durationMs;
    const start = zonedParts(new Date(candidate), input.timeZone);
    const end = zonedParts(new Date(candidateEnd), input.timeZone);
    const weekdayAllowed = input.includeWeekends || (start.weekday !== "Sat" && start.weekday !== "Sun");
    const withinWorkHours =
      start.date === end.date && start.minutes >= workStart && end.minutes <= workEnd && end.minutes > start.minutes;
    const available = !busy.some((period) => candidate < period.end && candidateEnd > period.start);
    if (weekdayAllowed && withinWorkHours && available) {
      suggestions.push({
        start: new Date(candidate).toISOString(),
        end: new Date(candidateEnd).toISOString(),
        displayStart: formatSlot(new Date(candidate), input.timeZone),
        displayEnd: formatSlot(new Date(candidateEnd), input.timeZone),
        timeZone: input.timeZone,
      });
    }
    candidate += incrementMs;
  }
  return suggestions;
}
