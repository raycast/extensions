import moment from "moment-timezone";

import { ValidationError } from "../domain/errors";
import type { CreateTaskInput } from "../domain/task";

export interface CreateDefaultsDependencies {
  readonly now: Date;
  readonly uiTimeZone: string;
  readonly readSelectedText: () => Promise<unknown>;
  readonly readClipboardText: () => Promise<unknown>;
}

export interface CreateDefaults {
  readonly defaultTitle?: string;
  readonly defaultDate?: Date;
}

export interface CreateFormDefaults extends CreateDefaults {
  readonly uiTimeZone: string;
}

export interface QuickAddDefaults {
  readonly defaultDate?: Date;
  readonly uiTimeZone?: string;
}

type DefaultTitlePreference = "none" | "selection" | "clipboard";
type DefaultDatePreference = "none" | "today" | "tomorrow" | "dayAfterTomorrow" | "nextWeek";
type TimeZone = NonNullable<ReturnType<typeof moment.tz.zone>>;
type TimeZoneSnapshot = Readonly<{
  uiTimeZone: string;
  timeZone: TimeZone;
}>;
type DateDependenciesSnapshot = TimeZoneSnapshot &
  Readonly<{
    nowEpochMs: number;
  }>;

const DATE_DEFAULTS_UNAVAILABLE_MESSAGE = "Task creation date defaults are unavailable.";
const FLOATING_DUE_DATE_FORMAT = "YYYY-MM-DDTHH:mm:ss.SSSZ";
const CANONICAL_FLOATING_DUE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/;
const UNSAFE_TEXT_PATTERN = /[\p{Cc}\p{Cf}]/u;
const HOUR_IN_MS = 60 * 60 * 1_000;

function readPreference(preferences: unknown, property: "defaultTitle" | "defaultDate"): unknown {
  if ((typeof preferences !== "object" && typeof preferences !== "function") || preferences === null) {
    return undefined;
  }

  try {
    return Reflect.get(preferences, property);
  } catch {
    return undefined;
  }
}

function normalizeDefaultTitle(value: unknown): DefaultTitlePreference {
  return value === "selection" || value === "clipboard" || value === "none" ? value : "none";
}

function normalizeDefaultDate(value: unknown): DefaultDatePreference {
  return value === "today" ||
    value === "tomorrow" ||
    value === "dayAfterTomorrow" ||
    value === "nextWeek" ||
    value === "none"
    ? value
    : "none";
}

function hasWellFormedUtf16(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!Number.isInteger(nextCodeUnit) || nextCodeUnit < 0xdc00 || nextCodeUnit > 0xdfff) return false;
      index += 1;
      continue;
    }

    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) return false;
  }

  return true;
}

function safeTitle(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.trim().length === 0) return undefined;
  if (!hasWellFormedUtf16(value) || UNSAFE_TEXT_PATTERN.test(value)) return undefined;
  return value;
}

async function resolveDefaultTitle(
  preference: DefaultTitlePreference,
  dependencies: CreateDefaultsDependencies
): Promise<string | undefined> {
  if (preference === "none") return undefined;

  let readText: (() => Promise<unknown>) | undefined;
  try {
    readText = preference === "selection" ? dependencies.readSelectedText : dependencies.readClipboardText;
  } catch {
    return undefined;
  }

  if (typeof readText !== "function") return undefined;

  try {
    return safeTitle(await Reflect.apply(readText, dependencies, []));
  } catch {
    return undefined;
  }
}

function dateValidationError(): ValidationError {
  return new ValidationError(DATE_DEFAULTS_UNAVAILABLE_MESSAGE);
}

function snapshotTimeZone(dependencies: CreateDefaultsDependencies): TimeZoneSnapshot {
  let uiTimeZone: unknown;

  try {
    uiTimeZone = dependencies.uiTimeZone;
  } catch {
    throw dateValidationError();
  }

  return validateTimeZone(uiTimeZone);
}

function snapshotDateDependencies(dependencies: CreateDefaultsDependencies): DateDependenciesSnapshot {
  let now: unknown;
  let uiTimeZone: unknown;

  try {
    now = dependencies.now;
    uiTimeZone = dependencies.uiTimeZone;
  } catch {
    throw dateValidationError();
  }

  let nowEpochMs: number;
  try {
    if (!(now instanceof Date)) throw dateValidationError();
    nowEpochMs = Date.prototype.getTime.call(now);
  } catch {
    throw dateValidationError();
  }

  if (!Number.isFinite(nowEpochMs)) throw dateValidationError();

  return { nowEpochMs, ...validateTimeZone(uiTimeZone) };
}

function validateTimeZone(uiTimeZone: unknown): TimeZoneSnapshot {
  if (
    typeof uiTimeZone !== "string" ||
    uiTimeZone.length === 0 ||
    uiTimeZone.trim() !== uiTimeZone ||
    !hasWellFormedUtf16(uiTimeZone) ||
    UNSAFE_TEXT_PATTERN.test(uiTimeZone)
  ) {
    throw dateValidationError();
  }

  let timeZone: TimeZone | null;
  try {
    timeZone = moment.tz.zone(uiTimeZone);
  } catch {
    throw dateValidationError();
  }
  if (timeZone === null) throw dateValidationError();

  return { uiTimeZone, timeZone };
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function nextWholeLocalHour(nowEpochMs: number, uiTimeZone: string, timeZone: TimeZone): number {
  let intervalIndex = 0;
  while (intervalIndex < timeZone.untils.length && nowEpochMs >= timeZone.untils[intervalIndex]) {
    intervalIndex += 1;
  }

  let lowerBound = nowEpochMs + 1;
  for (; intervalIndex < timeZone.untils.length; intervalIndex += 1) {
    const intervalEnd = timeZone.untils[intervalIndex];
    const offsetMs = Math.round(timeZone.offsets[intervalIndex] * 60_000);
    if (!Number.isFinite(offsetMs)) throw dateValidationError();

    const localLowerBound = lowerBound - offsetMs;
    const remainder = positiveModulo(localLowerBound, HOUR_IN_MS);
    const candidate = remainder === 0 ? lowerBound : lowerBound + HOUR_IN_MS - remainder;

    if (candidate < intervalEnd) {
      const roundTrip = moment.tz(candidate, uiTimeZone);
      if (
        candidate > nowEpochMs &&
        roundTrip.minute() === 0 &&
        roundTrip.second() === 0 &&
        roundTrip.millisecond() === 0
      ) {
        return candidate;
      }
      throw dateValidationError();
    }

    lowerBound = intervalEnd;
  }

  throw dateValidationError();
}

function resolveDefaultDate(
  preference: DefaultDatePreference,
  dependencies: CreateDefaultsDependencies
): Date | undefined {
  if (preference === "none") return undefined;

  return resolveDefaultDateFromSnapshot(preference, snapshotDateDependencies(dependencies));
}

function resolveDefaultDateFromSnapshot(
  preference: Exclude<DefaultDatePreference, "none">,
  snapshot: DateDependenciesSnapshot
): Date {
  const { nowEpochMs, uiTimeZone, timeZone } = snapshot;

  try {
    const now = moment.tz(nowEpochMs, uiTimeZone);
    const resolved =
      preference === "today"
        ? moment.tz(nextWholeLocalHour(nowEpochMs, uiTimeZone, timeZone), uiTimeZone)
        : now
            .clone()
            .add(preference === "tomorrow" ? 1 : preference === "dayAfterTomorrow" ? 2 : 7, "day")
            .startOf("day")
            .hour(9);

    const epochMs = resolved.valueOf();
    if (!Number.isFinite(epochMs)) throw dateValidationError();

    return Object.freeze(new Date(epochMs));
  } catch {
    throw dateValidationError();
  }
}

export async function resolveCreateDefaults(
  preferences: unknown,
  dependencies: CreateDefaultsDependencies
): Promise<CreateDefaults> {
  const defaultTitlePreference = normalizeDefaultTitle(readPreference(preferences, "defaultTitle"));
  const defaultDatePreference = normalizeDefaultDate(readPreference(preferences, "defaultDate"));

  const defaultDate = resolveDefaultDate(defaultDatePreference, dependencies);
  const defaultTitle = await resolveDefaultTitle(defaultTitlePreference, dependencies);

  return Object.freeze({
    ...(defaultTitle === undefined ? {} : { defaultTitle }),
    ...(defaultDate === undefined ? {} : { defaultDate }),
  });
}

export async function resolveCreateFormDefaults(
  preferences: unknown,
  dependencies: CreateDefaultsDependencies
): Promise<CreateFormDefaults> {
  const defaultTitlePreference = normalizeDefaultTitle(readPreference(preferences, "defaultTitle"));
  const defaultDatePreference = normalizeDefaultDate(readPreference(preferences, "defaultDate"));
  let defaultDate: Date | undefined;
  let timeZoneSnapshot: TimeZoneSnapshot;
  if (defaultDatePreference === "none") {
    timeZoneSnapshot = snapshotTimeZone(dependencies);
  } else {
    const dateSnapshot = snapshotDateDependencies(dependencies);
    timeZoneSnapshot = dateSnapshot;
    defaultDate = resolveDefaultDateFromSnapshot(defaultDatePreference, dateSnapshot);
  }
  const defaultTitle = await resolveDefaultTitle(defaultTitlePreference, dependencies);

  return Object.freeze({
    ...(defaultTitle === undefined ? {} : { defaultTitle }),
    ...(defaultDate === undefined ? {} : { defaultDate }),
    uiTimeZone: timeZoneSnapshot.uiTimeZone,
  });
}

export function resolveQuickAddDefaults(
  preferences: unknown,
  dependencies: CreateDefaultsDependencies
): QuickAddDefaults {
  const defaultDatePreference = normalizeDefaultDate(readPreference(preferences, "defaultDate"));
  if (defaultDatePreference === "none") return Object.freeze({});

  const dateSnapshot = snapshotDateDependencies(dependencies);
  return Object.freeze({
    defaultDate: resolveDefaultDateFromSnapshot(defaultDatePreference, dateSnapshot),
    uiTimeZone: dateSnapshot.uiTimeZone,
  });
}

export function applyDefaultDate(input: CreateTaskInput, defaults: QuickAddDefaults): Readonly<CreateTaskInput> {
  const inputSnapshot = snapshotCreateTaskInput(input);
  if (typeof inputSnapshot.dueDate === "string" && inputSnapshot.dueDate.length > 0) {
    return freezeCreateTaskInput(inputSnapshot);
  }

  let defaultDate: unknown;
  let uiTimeZone: unknown;
  try {
    defaultDate = defaults.defaultDate;
    if (defaultDate === undefined) return freezeCreateTaskInput(inputSnapshot);
    uiTimeZone = defaults.uiTimeZone;
  } catch {
    throw dateValidationError();
  }

  const { uiTimeZone: validatedTimeZone } = validateTimeZone(uiTimeZone);
  let epochMs: number;
  try {
    if (!(defaultDate instanceof Date)) throw dateValidationError();
    epochMs = Date.prototype.getTime.call(defaultDate);
  } catch {
    throw dateValidationError();
  }
  if (!Number.isFinite(epochMs)) throw dateValidationError();

  let dueDate: string;
  try {
    dueDate = moment.tz(epochMs, validatedTimeZone).format(FLOATING_DUE_DATE_FORMAT);
    const parsed = moment.parseZone(dueDate, FLOATING_DUE_DATE_FORMAT, true);
    if (
      !CANONICAL_FLOATING_DUE_DATE_PATTERN.test(dueDate) ||
      !parsed.isValid() ||
      parsed.format(FLOATING_DUE_DATE_FORMAT) !== dueDate ||
      parsed.valueOf() !== epochMs
    ) {
      throw dateValidationError();
    }
  } catch {
    throw dateValidationError();
  }

  return freezeCreateTaskInput({
    ...inputSnapshot,
    dueDate,
    isAllDay: inputSnapshot.isAllDay === undefined ? false : inputSnapshot.isAllDay,
    isFloating: inputSnapshot.isFloating === undefined ? true : inputSnapshot.isFloating,
    timeZone: inputSnapshot.timeZone === undefined ? validatedTimeZone : inputSnapshot.timeZone,
  });
}

function snapshotCreateTaskInput(input: CreateTaskInput): CreateTaskInput {
  const snapshot = { ...input };
  if (Array.isArray(snapshot.tags)) snapshot.tags = [...snapshot.tags];
  if (Array.isArray(snapshot.items)) snapshot.items = snapshot.items.map((item) => ({ ...item }));
  return snapshot;
}

function freezeCreateTaskInput(input: CreateTaskInput): Readonly<CreateTaskInput> {
  if (Array.isArray(input.tags)) Object.freeze(input.tags);
  if (Array.isArray(input.items)) {
    for (const item of input.items) Object.freeze(item);
    Object.freeze(input.items);
  }
  return Object.freeze(input);
}
