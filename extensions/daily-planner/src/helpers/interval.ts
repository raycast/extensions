/* eslint-disable @typescript-eslint/no-unnecessary-condition */
// `ModelResult.resolution` type declaration doesn't include `null`, but in reality, it's often `null`.
import { Constants, Culture, DateTimeRecognizer } from "@microsoft/recognizers-text-date-time";
import { areIntervalsOverlapping, differenceInCalendarDays } from "date-fns";
import { CalendarEvent, DateInterval, TimeValueInterval } from "../types";
import { PreferenceError } from "./errors";

interface TimeComponents {
  h: number;
  m: number;
  s: number;
  ms: number;
}

const periodSubType = {
  [Constants.SYS_DATETIME_DATEPERIOD]: "daterange",
  [Constants.SYS_DATETIME_TIMEPERIOD]: "timerange",
  [Constants.SYS_DATETIME_DATETIMEPERIOD]: "datetimerange",
} as const;

type PeriodSubType = (typeof periodSubType)[keyof typeof periodSubType];

interface PeriodValue {
  start: string | undefined;
  end: string | undefined;
}

type SimplifiedDateTimeModelResult = Map<PeriodSubType, PeriodValue[]> & Map<string, string[]>;

const recognizer = new DateTimeRecognizer(Culture.English);
const model = recognizer.getDateTimeModel(Culture.English);
const PARSER_NAME = "datetimeV2"; // defined in baseMerged.ts

// The duration (in milliseconds) used when neither `preferredDuration` nor `preferFullDay` is passed to `toTimeSlots`.
const fallbackDuration = 3_600_000;

// The maximum number of calendar days to be searched when evaluating a single search interval. This upper bound
// prevents JS heap out of memory with the last element of "free working hours", which stretches to max time.
const maxSearchCalendarDays = 7;

// The number of milliseconds representing a time interval from which reporting periods will be suggested.
const reportingPeriodRange = 604_800_000;

function parseHHmmss(timeStr: string | undefined): TimeComponents | null {
  if (!timeStr) return null;
  const [h, m, s] = timeStr.split(":").map((component) => parseInt(component));
  // DateTimeRecognizer returns 0-based hours (0-23)
  return 0 <= h && h < 24 && 0 <= m && m < 60 && 0 <= s && s < 60 ? { h, m, s, ms: 0 } : null;
}

function parseTimeString(timeStr: string): TimeComponents | null {
  const firstResult = model.parse(timeStr).at(0);
  if (
    firstResult &&
    firstResult.typeName === `${PARSER_NAME}.${Constants.SYS_DATETIME_TIME}` &&
    firstResult.resolution
  ) {
    return parseHHmmss((firstResult.resolution.values as { value: string }[]).at(0)?.value);
  }
  return null;
}

// Returns `true` if `lhs` is before `rhs`.
function isBefore(lhs: TimeComponents, rhs: TimeComponents): boolean {
  return (
    lhs.h < rhs.h ||
    (lhs.h === rhs.h && (lhs.m < rhs.m || (lhs.m === rhs.m && (lhs.s < rhs.s || (lhs.s === rhs.s && lhs.ms < rhs.ms)))))
  );
}

// Returns `true` if the given date is before the time of the day represented by the given time components.
function isBeforeTime(date: Date, { h, m, s, ms }: TimeComponents) {
  const hours = date.getHours();
  if (hours !== h) return hours < h;
  const minutes = date.getMinutes();
  if (minutes !== m) return minutes < m;
  const seconds = date.getSeconds();
  if (seconds !== s) return seconds < s;
  const milliseconds = date.getMilliseconds();
  return milliseconds < ms;
}

// Returns an array of time value intervals that represent non-working hours within the given interval.
export function getOffHours(
  workingHoursStart: string,
  workingHoursEnd: string,
  withinInterval: TimeValueInterval
): [TimeValueInterval[] | undefined, Error | undefined] {
  // In addition to user errors, `workingHoursStart` and `workingHoursEnd` may be `undefined` if they are missing in
  // package.json or this module was erroneously called by a command other than "Block Time".
  if (!workingHoursStart) {
    const error = new PreferenceError('"Working Hours Start Time" is not specified.', "command");
    return [undefined, error];
  }
  if (!workingHoursEnd) {
    const error = new PreferenceError('"Working Hours End Time" is not specified.', "command");
    return [undefined, error];
  }

  const startTime = parseTimeString(workingHoursStart);
  const endTime = parseTimeString(workingHoursEnd);
  if (!startTime) {
    const error = new PreferenceError(`Unable to parse "${workingHoursStart}" into a time. Try "h:mm AM".`, "command");
    return [undefined, error];
  }
  if (!endTime) {
    const error = new PreferenceError(`Unable to parse "${workingHoursEnd}" into a time. Try "h:mm PM".`, "command");
    return [undefined, error];
  }
  if (isBefore(endTime, startTime)) {
    const error = new PreferenceError(
      '"Working Hours End Time" must precede or match "Working Hours Start Time".',
      "command"
    );
    return [undefined, error];
  }

  const nonWorkingHours: TimeValueInterval[] = [];
  const startDate = new Date(withinInterval.start);
  const [y, m, d] = [startDate.getFullYear(), startDate.getMonth(), startDate.getDate()];
  if (isBeforeTime(startDate, startTime)) {
    nonWorkingHours.push({
      start: startDate.setHours(0, 0, 0, 0),
      end: new Date(y, m, d, startTime.h, startTime.m, startTime.s, startTime.ms).getTime(),
    });
  }
  const calendarDays = differenceInCalendarDays(withinInterval.end, withinInterval.start);
  for (let i = 0; i <= calendarDays; i++) {
    nonWorkingHours.push({
      start: new Date(y, m, d + i, endTime.h, endTime.m, endTime.s, endTime.ms).getTime(),
      end: new Date(y, m, d + 1 + i, startTime.h, startTime.m, startTime.s, startTime.ms).getTime(),
    });
  }

  return [nonWorkingHours, undefined];
}

// Returns non-overlapping time intervals that are free and within the preferred working hours.
export function getAvailableTimes(
  upcomingEvents: CalendarEvent[] | undefined,
  nonWorkingHours: TimeValueInterval[] | undefined
): TimeValueInterval[] {
  const unavailableTimes = [...(upcomingEvents ?? []), ...(nonWorkingHours ?? [])];
  unavailableTimes.sort((a, b) => a.start - b.start);

  // Find free time slots from now to the start of the last busy block.
  let pointInTime = Date.now();
  const availableTimes: TimeValueInterval[] = [];
  for (const { start, end } of unavailableTimes) {
    if (end < pointInTime) {
      continue;
    }
    if (pointInTime < start) {
      availableTimes.push({ start: pointInTime, end: start });
    }
    pointInTime = end;
  }
  return availableTimes;
}

// Alternative to date-fns `roundToNearestMinutes`, which currently returns incorrect results when the rounding method
// is "ceil". (#3129, #3242, #3268) PR #3132 hasn't been merged since July 2022.
function roundUpToNearestMinutes(timeValue: number, nearestTo: number): number {
  const divisor = (() => {
    // Find the greatest common divisor of `nearestTo` and 30, an upper limit that keeps the gap between now and the
    // start of the first suggested block below 30. A negative `nearestTo` makes this function to round down.
    let n1 = Math.max(nearestTo, 30);
    let n2 = Math.min(nearestTo, 30);
    // Returns usually within 2 iterations.
    for (;;) {
      if (n2 === 0) return n1;
      n1 %= n2;
      if (n1 === 0) return n2;
      n2 %= n1;
    }
  })();
  const minutesAndBelow = timeValue % 3_600_000;
  const hoursAndAbove = timeValue - minutesAndBelow;
  const minutes = minutesAndBelow / 60_000;
  const roundedMinutes = Math.ceil(minutes / divisor) * divisor;
  return hoursAndAbove + roundedMinutes * 60_000;
}

// Divides the given time value intervals into an ordered list of at most ~20 subintervals of the given duration. The
// subintervals overlap if some of the given `intervals` are shorter than (2 * `duration`) and longer than
// (`duration` + 5 minutes).
function splitIntervals(
  intervals: TimeValueInterval[] | DateInterval[] | undefined,
  duration: number,
  earliestPossibleStart?: number
): DateInterval[] {
  if (!intervals?.length || duration === 0) {
    return [];
  }

  const fiveMinutes = 300_000;
  const upperLimit = 20;
  const freeTimes: DateInterval[] = [];

  for (const interval of intervals) {
    const originalStart = typeof interval.start === "number" ? interval.start : interval.start.getTime();
    const end = typeof interval.end === "number" ? interval.end : interval.end.getTime();

    if (earliestPossibleStart && end <= earliestPossibleStart) {
      continue;
    }
    // Ensure the block's start time is in the future (necessary only for the first element of `availableTimes`).
    const start = earliestPossibleStart ? Math.max(originalStart, earliestPossibleStart) : originalStart;
    if (end - start < duration) {
      continue;
    }

    // Round the start minute up to the greatest common divisor between `blockDuration` and 30.
    const roundedStart = roundUpToNearestMinutes(start, duration);

    // Add a block that starts at the start of the interval, if significantly different from the rounded start.
    if (roundedStart - start >= fiveMinutes) {
      freeTimes.push({
        start: new Date(start),
        end: new Date(start + duration),
      });
    }
    // Split the interval (up to 20 to prevent "JS heap out of memory")
    const latestPossibleStart = end - duration;
    for (let start = roundedStart; start <= latestPossibleStart && freeTimes.length < upperLimit; start += duration) {
      freeTimes.push({
        start: new Date(start),
        end: new Date(start + duration),
      });
    }

    // Add a block that ends at the end of the interval, if significantly different from the last added block.
    if (
      0 < freeTimes.length &&
      freeTimes.length < upperLimit &&
      end - freeTimes[freeTimes.length - 1].end.getTime() >= fiveMinutes
    ) {
      freeTimes.push({
        start: new Date(end - duration),
        end: new Date(end),
      });
    }

    if (freeTimes.length >= upperLimit) {
      break;
    }
  }

  return freeTimes;
}

// Returns the DateTimeRecognizer model's parse() results without the intermediary model outputs.
// Multiple recognized values of the same type are pooled together in an array.
// See https://github.com/Microsoft/Recognizers-Text/tree/master/JavaScript/samples#botbuilder-sample-source
function parseSearchText(searchText: string): SimplifiedDateTimeModelResult | null {
  const results = model.parse(searchText);
  if (results.length === 0 || !results[0].typeName.startsWith(PARSER_NAME)) {
    return null;
  }

  const modelResults: SimplifiedDateTimeModelResult = new Map();
  const upsert = <T extends PeriodSubType | string>(
    key: T,
    values: T extends PeriodSubType ? PeriodValue[] : string[]
  ): void => {
    const existing = modelResults.get(key);
    if (existing) {
      existing.push(...values);
    } else {
      modelResults.set(key, values);
    }
  };

  for (const result of results) {
    // `resolution` may be `null`, e.g., if `query` is "100-300pm"
    const resolutionValues = result.resolution?.values as Record<string, string>[];
    if (!resolutionValues || resolutionValues.length === 0) {
      continue;
    }

    const subType = result.typeName.split(".")[1];
    if (subType in periodSubType) {
      // timerange, daterange, datetimerange
      const ranges = resolutionValues.map(({ start, end }) => ({ start, end }));
      upsert(periodSubType[subType], ranges);
    } else {
      // duration, time, date, datetime
      // time, date, datetime are not treated as `start` of a *range because 1) `parseSearchText` is supposed to only
      // simplify, not transform, the results, and 2) datetime may be supplementary to timerange.
      const values = resolutionValues.map(({ value }) => value);
      upsert(subType, values);
    }
  }
  return modelResults;
}

// Returns the number of milliseconds extracted from the given duration string, which is assumed to represent seconds.
// If the given string cannot be parsed, returns `null`.
function parseDuration(duration: string): number | null {
  const seconds = parseInt(duration);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1_000;
  }
  return null;
}

// Returns `true` if the given date is after the time of the day represented by the given time components.
// function isAfterTime(date: Date, { h, m, s }: TimeComponents) {
//   const hours = date.getHours();
//   const minutes = date.getMinutes();
//   const seconds = date.getSeconds();
//   return h < hours || (h === hours && (m < minutes || (m === minutes && s < seconds)));
// }

function toMilliseconds({ h, m, s, ms }: TimeComponents): number {
  return h * 3_600_000 + m * 60_000 + s * 1_000 + ms;
}

function addDuration(base: TimeComponents, duration: number): TimeComponents {
  const baseMilliseconds = toMilliseconds(base);
  const milliseconds = baseMilliseconds + duration;
  const ms = milliseconds % 1_000;
  const seconds = Math.trunc(milliseconds / 1_000);
  const s = seconds % 60;
  const minutes = Math.trunc(seconds / 60);
  const m = minutes % 60;
  const h = Math.trunc(minutes / 60);
  return { h, m, s, ms };
}

function differenceInMilliseconds(end: TimeComponents, start: TimeComponents): number {
  return toMilliseconds(end) - toMilliseconds(start);
}

function toTimeSlots(
  modelResults: SimplifiedDateTimeModelResult,
  searchIntervals: TimeValueInterval[],
  { preferredDuration, preferFullDay }: { preferredDuration?: number; preferFullDay?: boolean }
): DateInterval[] {
  // `datetime` & `datetimerange` helper functions
  const toDateTimeIntervals = ({ start: lhs, end: rhs }: PeriodValue, durations?: number[]): DateInterval[] => {
    if (lhs && rhs) {
      const lhsDate = new Date(lhs);
      const rhsDate = new Date(rhs);
      // Ensure `start` <= `end` (Microsoft DateTimeRecognizer doesn't guarantee it, e.g., for "tomorrow 9-8")
      return lhsDate < rhsDate ? [{ start: lhsDate, end: rhsDate }] : [{ start: rhsDate, end: lhsDate }];
    }
    if (lhs) {
      // "1 hour starting in 45 mins"
      const start = new Date(lhs);
      return durations
        ? durations.map((duration) => ({ start, end: new Date(start.getTime() + duration) }))
        : [{ start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999) }];
    }
    if (rhs) {
      // "2 hours until noon tmr"
      const end = new Date(rhs);
      return durations
        ? durations.map((duration) => ({ start: new Date(end.getTime() - duration), end }))
        : [{ start: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0), end }];
    }
    return [];
  };

  const compareOverlappingFreeIntervals = (a: DateInterval, b: DateInterval) => {
    // Show results that overlap with an earlier free time interval before those fall within a later one.
    // Percentage doesn't matter as long as there's an overlap. Penalize those outside the free time intervals.
    const aIndex = searchIntervals.findIndex((interval) => areIntervalsOverlapping(a, interval));
    const bIndex = searchIntervals.findIndex((interval) => areIntervalsOverlapping(b, interval));
    return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
  };

  // `time` & `timerange` helper functions
  const findTimeIntervals = (
    lhs: TimeComponents,
    rhs: TimeComponents,
    useFromForFallbackReference: boolean
  ): DateInterval[] => {
    const [from, to] = isBefore(lhs, rhs) ? [lhs, rhs] : [rhs, lhs];
    const duration = differenceInMilliseconds(to, from);
    const freeTimes: DateInterval[] = [];
    for (const interval of searchIntervals) {
      if (interval.end - interval.start < duration) {
        continue;
      }
      const days = Math.min(differenceInCalendarDays(interval.end, interval.start), maxSearchCalendarDays);
      const start = new Date(interval.start);
      const [y, m, d] = [start.getFullYear(), start.getMonth(), start.getDate()];
      for (let i = 0; i <= days; i++) {
        const start = new Date(y, m, d + i, from.h, from.m, from.s, from.ms);
        const end = new Date(y, m, d + i, to.h, to.m, to.s, to.ms);
        if (interval.start <= start.getTime() && end.getTime() <= interval.end) {
          freeTimes.push({ start, end });
        }
      }
    }
    if (freeTimes.length === 0) {
      // If this time is unavailable in all of the next few days, return today or tomorrow's.
      const now = new Date();
      const [y, m, d] = [now.getFullYear(), now.getMonth(), now.getDate()];
      const dayOfMonth = isBeforeTime(now, useFromForFallbackReference ? from : to) ? d : d + 1;
      freeTimes.push({
        start: new Date(y, m, dayOfMonth, from.h, from.m, from.s, from.ms),
        end: new Date(y, m, dayOfMonth, to.h, to.m, to.s, to.ms),
      });
    }
    return freeTimes;
  };

  const findTimeIntervalsWithDurations = ({ start, end }: PeriodValue, durations?: number[]): DateInterval[] => {
    const startTime = parseHHmmss(start);
    const endTime = parseHHmmss(end);
    if (startTime && endTime) {
      const intervals = findTimeIntervals(startTime, endTime, true);
      // "45 minutes between 9-11am" (former) or "early morning or late afternoon" (latter)
      return durations?.length ? durations.flatMap((duration) => splitIntervals(intervals, duration)) : intervals;
    }
    if (durations) {
      if (startTime) {
        // "2h from 1p"
        return durations.flatMap((duration) => findTimeIntervals(startTime, addDuration(startTime, duration), true));
      }
      if (endTime) {
        // "2 hours until noon"
        return durations.flatMap((duration) => findTimeIntervals(addDuration(endTime, -duration), endTime, false));
      }
    }
    return [];
  };

  const findSameDayTimeIntervals = ({ start, end }: PeriodValue): DateInterval[] => {
    const startTime: TimeComponents = parseHHmmss(start) ?? { h: 0, m: 0, s: 0, ms: 0 };
    const endTime: TimeComponents = parseHHmmss(end) ?? { h: 23, m: 59, s: 59, ms: 999 };
    return findTimeIntervals(startTime, endTime, !!start);
  };

  // `date` & `daterange` helper functions
  const findFreeTimesBetween = (startValue: number, endValue: number, duration: number): DateInterval[] => {
    const targetDateFreeTimeIntervals: TimeValueInterval[] = [];
    for (const interval of searchIntervals) {
      if (endValue < interval.start) break;
      if (interval.end <= startValue) continue;
      targetDateFreeTimeIntervals.push({
        start: Math.max(interval.start, startValue),
        end: Math.min(interval.end, endValue),
      });
    }
    return splitIntervals(targetDateFreeTimeIntervals, duration);
  };

  const findFreeTimesWithDateRange = ({ start, end }: PeriodValue, durations: number[]): DateInterval[] => {
    if (start && end) {
      // "wed - fri"
      const startValue = new Date(start + "T00:00:00").getTime();
      const endValue = new Date(end + "T23:59:59.999").getTime();
      return durations.flatMap((duration) => findFreeTimesBetween(startValue, endValue, duration));
    }
    if (start) {
      // "tomorrow" or "from Tuesday"
      const date = new Date(start + "T00:00:00");
      const startValue = date.getTime();
      const endValue = date.setHours(23, 59, 59, 999);
      return durations.flatMap((duration) => findFreeTimesBetween(startValue, endValue, duration));
    }
    if (end) {
      // "until thursday"
      const startValue = Date.now();
      const endValue = new Date(end + "T23:59:59.999").getTime();
      return durations.flatMap((duration) => findFreeTimesBetween(startValue, endValue, duration));
    }
    return [];
  };

  const toFullDayIntervals = ({ start, end }: PeriodValue): DateInterval => {
    // At least one of the two input parameters will be truthy.
    return {
      start: new Date((start ?? end ?? "2001-01-01") + "T00:00:00"),
      end: new Date((end ?? start ?? "2050-12-31") + "T23:59:59.999"),
    };
  };

  const startDateAscending = (a: DateInterval, b: DateInterval) => a.start.getTime() - b.start.getTime();
  const startDateDescending = (a: DateInterval, b: DateInterval) => b.start.getTime() - a.start.getTime();

  // Durations (if missing, `defaultDuration`) are used to fill in missing start or end date/times.
  const durationStrings = modelResults.get(Constants.SYS_DATETIME_DURATION);
  const parsedDurations = durationStrings?.length
    ? [...new Set(durationStrings.flatMap((d) => parseDuration(d) ?? []))]
    : undefined;
  const durations = parsedDurations ?? [preferredDuration ?? fallbackDuration];

  // Start processing model results. Range results first.
  const datetimeranges = modelResults.get(periodSubType[Constants.SYS_DATETIME_DATETIMEPERIOD]);
  if (datetimeranges) {
    const intervals = datetimeranges
      .flatMap((datetimerange) =>
        toDateTimeIntervals(datetimerange, preferFullDay && !parsedDurations ? undefined : durations)
      )
      .sort(compareOverlappingFreeIntervals);

    // If durations are given, e.g., "45 minutes tomorrow morning" split the intervals.
    return parsedDurations?.length
      ? parsedDurations.flatMap((duration) => splitIntervals(intervals, duration))
      : intervals;
  }

  const timeranges = modelResults.get(periodSubType[Constants.SYS_DATETIME_TIMEPERIOD]);
  if (timeranges) {
    const dateStrs = modelResults.get(Constants.SYS_DATETIME_DATETIME) ?? modelResults.get(Constants.SYS_DATETIME_DATE);
    if (dateStrs) {
      // If date components are found, use them to turn timeranges into datetimeranges, ignoring any attached time
      // components, which are likely to be the same as either end of the timeranges.
      // "friday 9:30-11" or "9-10:30am tomorrow" (not recognized as `datetimerange` due to differing time formats)
      const uniqueDatePrefixes = [...new Set(dateStrs.map((dStr) => dStr.slice(0, 10) + "T"))];
      return uniqueDatePrefixes
        .flatMap((datePrefix) =>
          timeranges.flatMap(({ start, end }) =>
            toDateTimeIntervals(
              { start: start ? datePrefix + start : undefined, end: end ? datePrefix + end : undefined },
              preferFullDay && !parsedDurations ? undefined : durations
            )
          )
        )
        .sort(compareOverlappingFreeIntervals);
    }

    return preferFullDay && !parsedDurations
      ? timeranges.flatMap((timerange) => findSameDayTimeIntervals(timerange).sort(startDateDescending))
      : timeranges
          .flatMap((timerange) => findTimeIntervalsWithDurations(timerange, parsedDurations))
          .sort(startDateAscending);
  }

  const dateranges = modelResults.get(periodSubType[Constants.SYS_DATETIME_DATEPERIOD]);
  if (dateranges) {
    return preferFullDay && !parsedDurations
      ? dateranges.map((daterange) => toFullDayIntervals(daterange))
      : dateranges.flatMap((daterange) => findFreeTimesWithDateRange(daterange, durations)).sort(startDateAscending);
  }

  // Standalone `datetime`, `date`, `time` values are treated as interval starting points.
  const datetimeStrs = modelResults.get(Constants.SYS_DATETIME_DATETIME);
  if (datetimeStrs) {
    return datetimeStrs
      .flatMap((start) =>
        toDateTimeIntervals({ start, end: undefined }, preferFullDay && !parsedDurations ? undefined : durations)
      )
      .sort(compareOverlappingFreeIntervals);
  }

  const timeStrs = modelResults.get(Constants.SYS_DATETIME_TIME);
  if (timeStrs) {
    return preferFullDay && !parsedDurations
      ? timeStrs.flatMap((timeStr) => findSameDayTimeIntervals({ start: timeStr, end: undefined }))
      : timeStrs.flatMap((timeStr) => findTimeIntervalsWithDurations({ start: timeStr, end: undefined }, durations));
  }

  const dateStrs = modelResults.get(Constants.SYS_DATETIME_DATE);
  if (dateStrs) {
    return preferFullDay && !parsedDurations
      ? dateStrs.map((dateStr) => toFullDayIntervals({ start: dateStr, end: undefined }))
      : dateStrs
          .flatMap((dateStr) => findFreeTimesWithDateRange({ start: dateStr, end: undefined }, durations))
          .sort(startDateAscending);
  }

  return [];
}

function hasDateOrTimeResult(modelResults: SimplifiedDateTimeModelResult): boolean {
  for (const key of modelResults.keys()) {
    if (key.startsWith(Constants.SYS_DATETIME_DATE) || key.startsWith(Constants.SYS_DATETIME_TIME)) {
      return true;
    }
  }
  return false;
}

// Adds the given time value interval to `availableTimes` in a way that there are nonzero gaps between the elements
// of `availableTimes`. Assumes that the existing elements of `availableTimes` have no overlaps, have nonzero gaps, and
// are sorted by start time. Also assumes that `currentInterval` overlaps with at most one element of `availableTimes`.
function addAvailableTime(
  currentInterval: TimeValueInterval | undefined,
  availableTimes: TimeValueInterval[] | undefined
): TimeValueInterval[] | undefined {
  if (!currentInterval && !availableTimes) return undefined;
  if (!currentInterval) return availableTimes;
  if (!availableTimes) return [currentInterval];

  const combinedAvailableTimes: TimeValueInterval[] = [];
  let isAdded = false;
  for (const time of availableTimes) {
    if (time.end < currentInterval.start) {
      combinedAvailableTimes.push(time);
      continue;
    }

    if (currentInterval.end < time.start) {
      if (!isAdded) {
        // `currentInterval` has no overlap with every element of `availableTimes`.
        combinedAvailableTimes.push(currentInterval);
        isAdded = true;
      }
      combinedAvailableTimes.push(time);
      continue;
    }

    const start = Math.min(time.start, currentInterval.start);
    const end = Math.max(time.end, currentInterval.end);
    combinedAvailableTimes.push({ start, end });
    isAdded = true;
  }

  return combinedAvailableTimes;
}

function getParsedDuration(modelResults: SimplifiedDateTimeModelResult | null): number | null {
  const durations = modelResults?.get(Constants.SYS_DATETIME_DURATION);
  if (!durations?.length) return null;
  const durationInMilliseconds = parseDuration(durations[0]);
  return durationInMilliseconds;
}

export function findTimeSlots(
  searchText: string,
  currentInterval: TimeValueInterval | undefined,
  availableTimes: TimeValueInterval[] | undefined,
  defaultDuration: number
): { timeSlots: DateInterval[]; isRecognized: boolean } {
  const preferredDuration = currentInterval ? currentInterval.end - currentInterval.start : defaultDuration;
  const combinedAvailableTimes = addAvailableTime(currentInterval, availableTimes);

  const modelResults = parseSearchText(searchText);
  if (modelResults && hasDateOrTimeResult(modelResults)) {
    const timeSlots = toTimeSlots(modelResults, combinedAvailableTimes ?? [], { preferredDuration });
    if (timeSlots.length > 0) {
      return {
        timeSlots,
        isRecognized: true,
      };
    }
  }

  const parsedDuration = getParsedDuration(modelResults);
  const duration = parsedDuration ?? preferredDuration;
  // The first possible start time is the next multiple-of-5 minute. Use the time this to-do item was selected, not
  // `now` from datetime.ts, which is when the command was initialized and can be a few minutes ago.
  const earliestPossibleStart = roundUpToNearestMinutes(Date.now(), 5);
  let timeSlots = splitIntervals(combinedAvailableTimes, duration, earliestPossibleStart);
  if (currentInterval) {
    for (let i = timeSlots.length - 1; i >= 0; i--) {
      const { start, end } = timeSlots[i];
      if (start.getTime() === currentInterval.start && end.getTime() === currentInterval.end) {
        timeSlots.splice(i, 1);
      }
    }
  }

  // If no free times were found, add next five time slots of the given duration.
  if (timeSlots.length === 0) {
    const nextFiveDurations: TimeValueInterval = {
      start: earliestPossibleStart,
      end: earliestPossibleStart + duration * 5,
    };
    timeSlots = splitIntervals([nextFiveDurations], duration, earliestPossibleStart);
  }

  return {
    timeSlots,
    isRecognized: parsedDuration !== null,
  };
}

export function getFullDayIntervals(searchText: string): DateInterval[] {
  const modelResults = parseSearchText(searchText);
  if (modelResults && hasDateOrTimeResult(modelResults)) {
    const now = Date.now();
    const searchInterval = { start: now - reportingPeriodRange, end: now };
    const timeSlots = toTimeSlots(modelResults, [searchInterval], { preferFullDay: true });
    if (timeSlots.length > 0) {
      return timeSlots;
    }
  }

  const duration = getParsedDuration(modelResults);
  if (duration) {
    const end = new Date();
    const start = new Date(end.getTime() - duration);
    return [{ start, end }];
  }

  return [];
}
