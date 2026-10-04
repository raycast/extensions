import { createHash, randomBytes } from "node:crypto";

import type { CalendarRecurrence } from "./apple-calendar";
import type { ParsedSchedule } from "./parse-korean-schedule";

export type CreationTarget = "calendar" | "reminder";

export const UNKNOWN_CREATION_OUTCOME_KEY = "__unknown_creation_outcome__";
const CREATION_OUTCOME_KEY_PATTERN = /^[a-f0-9]{64}$/u;
const UNCONFIRMED_CREATION_STORAGE_VERSION = 2;
const LEGACY_UNCONFIRMED_CREATION_STORAGE_VERSION = 1;

interface ExactUnconfirmedCreationRecord {
  id: string;
  creationOutcomeKey: string;
  retryItemKey: string;
  matchAny: false;
}

interface FallbackUnconfirmedCreationRecord {
  id: string;
  creationOutcomeKey: string;
  matchAny: true;
}

export type UnconfirmedCreationRecord = ExactUnconfirmedCreationRecord | FallbackUnconfirmedCreationRecord;

export interface CreationOutcomeCandidate {
  creationOutcomeKey: string;
  retryItemKey: string;
  allowRelaxedConsumption?: boolean;
}

export interface UnconfirmedCreationMatch {
  candidateIndex: number;
  record: UnconfirmedCreationRecord;
  kind: "exact" | "relaxed" | "fallback";
  consumeOnSuccess: boolean;
}

interface UnknownCreationCandidate extends CreationOutcomeCandidate {
  submissionIndex: number;
}

export function buildCreationOutcomeKey({
  targetType,
  parsed,
  recurrence,
}: {
  targetType: CreationTarget;
  parsed: ParsedSchedule;
  recurrence?: CalendarRecurrence;
}): string {
  const common = {
    targetType,
    title: parsed.title.trim(),
    startEpochMs: parsed.start.getTime(),
    allDay: parsed.allDay,
    location: parsed.location?.trim() ?? "",
  };

  if (targetType === "reminder") {
    return hashCreationIdentity(common);
  }

  return hashCreationIdentity({
    ...common,
    endEpochMs: parsed.end.getTime(),
    recurrence: recurrence
      ? {
          frequency: recurrence.frequency,
          interval: recurrence.interval ?? 1,
          weekday: recurrence.weekday ?? null,
          dayOfMonth: recurrence.dayOfMonth ?? null,
          end:
            recurrence.end.type === "count"
              ? { type: recurrence.end.type, count: recurrence.end.count }
              : { type: recurrence.end.type, untilEpochMs: recurrence.end.untilEpochMs },
        }
      : null,
  });
}

export function buildRetryItemKey(targetType: CreationTarget, parsed: ParsedSchedule): string {
  const common = {
    targetType,
    title: parsed.title.trim(),
    allDay: parsed.allDay,
  };

  if (parsed.recurrence) {
    return hashCreationIdentity({
      ...common,
      recurrence: buildRetryRecurrenceIdentity(parsed),
      startTime: buildTimeOfDayIdentity(parsed.start),
      endTime: buildTimeOfDayIdentity(parsed.end),
      endDayOffset: localCalendarDayOffset(parsed.start, parsed.end),
    });
  }

  const datedCommon = {
    ...common,
    startEpochMs: parsed.start.getTime(),
  };

  return hashCreationIdentity(
    targetType === "calendar"
      ? {
          ...datedCommon,
          endEpochMs: parsed.end.getTime(),
        }
      : datedCommon,
  );
}

export function createUnconfirmedCreationRecord(
  creationOutcomeKey: string,
  retryItemKey: string,
): UnconfirmedCreationRecord {
  return {
    id: randomBytes(32).toString("hex"),
    creationOutcomeKey,
    retryItemKey,
    matchAny: false,
  };
}

export function createUnknownUnconfirmedCreationRecord(source: string): UnconfirmedCreationRecord {
  return createFallbackRecord(UNKNOWN_CREATION_OUTCOME_KEY, `unknown:${source}`);
}

export function partitionUnconfirmedCreationRecords(
  records: UnconfirmedCreationRecord[],
  candidates: CreationOutcomeCandidate[],
): {
  matches: UnconfirmedCreationMatch[];
  matching: UnconfirmedCreationRecord[];
  remaining: UnconfirmedCreationRecord[];
} {
  const available = records.map(() => true);
  const consumed = records.map(() => false);
  const matchesByCandidate: Array<UnconfirmedCreationMatch | undefined> = candidates.map(() => undefined);

  const matchPass = (
    predicate: (record: UnconfirmedCreationRecord, candidate: CreationOutcomeCandidate) => boolean,
    kind: UnconfirmedCreationMatch["kind"],
    shouldConsume: boolean | ((candidate: CreationOutcomeCandidate) => boolean),
  ) => {
    for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
      if (matchesByCandidate[candidateIndex]) {
        continue;
      }
      const candidate = candidates[candidateIndex];
      const matchedIndex = findAvailableRecord(records, available, (record) => predicate(record, candidate));
      if (matchedIndex < 0) {
        continue;
      }
      const consumeOnSuccess = typeof shouldConsume === "function" ? shouldConsume(candidate) : shouldConsume;
      available[matchedIndex] = false;
      consumed[matchedIndex] = consumeOnSuccess;
      matchesByCandidate[candidateIndex] = {
        candidateIndex,
        record: records[matchedIndex],
        kind,
        consumeOnSuccess,
      };
    }
  };

  matchPass(
    (record, candidate) => {
      return !record.matchAny && record.creationOutcomeKey === candidate.creationOutcomeKey;
    },
    "exact",
    true,
  );
  matchPass(
    (record, candidate) => {
      return record.matchAny && record.creationOutcomeKey === candidate.creationOutcomeKey;
    },
    "fallback",
    true,
  );
  // A relaxed match may be a different item with edited location or recurrence settings.
  matchPass(
    (record, candidate) => {
      return !record.matchAny && record.retryItemKey === candidate.retryItemKey;
    },
    "relaxed",
    (candidate) => candidate.allowRelaxedConsumption === true,
  );
  matchPass((record) => record.matchAny, "fallback", true);

  const matches = matchesByCandidate.filter((match): match is UnconfirmedCreationMatch => match !== undefined);

  return {
    matches,
    matching: matches.map((match) => match.record),
    remaining: records.filter((_, index) => !consumed[index]),
  };
}

export function removeSuccessfulUnconfirmedCreationMatches(
  records: UnconfirmedCreationRecord[],
  matches: UnconfirmedCreationMatch[],
  successfulCandidateIndexes: ReadonlySet<number>,
): UnconfirmedCreationRecord[] {
  const resolvedRecordIds = new Set(
    matches
      .filter((match) => match.consumeOnSuccess && successfulCandidateIndexes.has(match.candidateIndex))
      .map((match) => match.record.id),
  );
  return records.filter((record) => !resolvedRecordIds.has(record.id));
}

export function mergeUnconfirmedCreationRecords(records: UnconfirmedCreationRecord[]): UnconfirmedCreationRecord[] {
  const unique = new Map<string, UnconfirmedCreationRecord>();
  for (const record of records) {
    unique.set(record.id, record);
  }
  return [...unique.values()];
}

export function mergeUnknownUnconfirmedCreationRecords(
  records: UnconfirmedCreationRecord[],
  matches: UnconfirmedCreationMatch[],
  unknownCandidates: UnknownCreationCandidate[],
): UnconfirmedCreationRecord[] {
  const matchesByCandidateIndex = new Map(matches.map((match) => [match.candidateIndex, match]));
  const unknownRecords = unknownCandidates.map((candidate) => {
    const match = matchesByCandidateIndex.get(candidate.submissionIndex);
    if (!match?.consumeOnSuccess) {
      return createUnconfirmedCreationRecord(candidate.creationOutcomeKey, candidate.retryItemKey);
    }

    return {
      id: match.record.id,
      creationOutcomeKey: candidate.creationOutcomeKey,
      retryItemKey: candidate.retryItemKey,
      matchAny: false as const,
    };
  });

  return mergeUnconfirmedCreationRecords([...records, ...unknownRecords]);
}

export function mergeLoadedUnconfirmedCreationRecords(
  currentRecords: UnconfirmedCreationRecord[],
  migratedRecords: UnconfirmedCreationRecord[],
): UnconfirmedCreationRecord[] {
  const merged = mergeUnconfirmedCreationRecords(currentRecords);
  const currentKeys = new Set(merged.map((record) => record.creationOutcomeKey));
  const fallbackKeys = new Set(merged.filter((record) => record.matchAny).map((record) => record.creationOutcomeKey));

  for (const record of migratedRecords) {
    if (currentKeys.has(record.creationOutcomeKey) || fallbackKeys.has(record.creationOutcomeKey)) {
      continue;
    }
    merged.push(record);
    fallbackKeys.add(record.creationOutcomeKey);
  }

  return merged;
}

export function serializeUnconfirmedCreationRecords(records: UnconfirmedCreationRecord[]): string {
  return JSON.stringify({
    version: UNCONFIRMED_CREATION_STORAGE_VERSION,
    records,
  });
}

export function parseStoredUnconfirmedCreationRecords(value: unknown): UnconfirmedCreationRecord[] {
  if (value === undefined || value === null || value === "") {
    return [];
  }
  if (typeof value !== "string") {
    return [createUnknownUnconfirmedCreationRecord("invalid-record-storage-type")];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isObject(parsed) || !Array.isArray(parsed.records)) {
      return [createUnknownUnconfirmedCreationRecord("invalid-record-storage-schema")];
    }
    if (!parsed.records.every(isUnconfirmedCreationRecord)) {
      return [createUnknownUnconfirmedCreationRecord("invalid-record-storage-value")];
    }
    const ids = new Set(parsed.records.map((record) => record.id));
    if (ids.size !== parsed.records.length) {
      return [createUnknownUnconfirmedCreationRecord("duplicate-record-id")];
    }
    if (parsed.version === UNCONFIRMED_CREATION_STORAGE_VERSION) {
      return parsed.records;
    }
    if (parsed.version === LEGACY_UNCONFIRMED_CREATION_STORAGE_VERSION) {
      return parsed.records.map((record) => createFallbackRecord(record.creationOutcomeKey, `record-v1:${record.id}`));
    }
    return [createUnknownUnconfirmedCreationRecord("unsupported-record-storage-version")];
  } catch {
    return [createUnknownUnconfirmedCreationRecord("invalid-record-storage-json")];
  }
}

export function migrateStoredUnconfirmedCreationKeys(value: unknown, source: string): UnconfirmedCreationRecord[] {
  return parseStoredUnconfirmedCreationKeys(value).map((creationOutcomeKey, index) =>
    createFallbackRecord(creationOutcomeKey, `${source}:${index}:${creationOutcomeKey}`),
  );
}

export function parseStoredUnconfirmedCreationKeys(value: unknown): string[] {
  if (value === undefined || value === null || value === "") {
    return [];
  }
  if (typeof value !== "string") {
    return [UNKNOWN_CREATION_OUTCOME_KEY];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      !Array.isArray(parsed) ||
      parsed.some(
        (item) =>
          typeof item !== "string" ||
          (item !== UNKNOWN_CREATION_OUTCOME_KEY && !CREATION_OUTCOME_KEY_PATTERN.test(item)),
      )
    ) {
      return [UNKNOWN_CREATION_OUTCOME_KEY];
    }
    return [...new Set(parsed)];
  } catch {
    return [UNKNOWN_CREATION_OUTCOME_KEY];
  }
}

function findAvailableRecord(
  records: UnconfirmedCreationRecord[],
  available: boolean[],
  predicate: (record: UnconfirmedCreationRecord) => boolean,
): number {
  return records.findIndex((record, index) => available[index] && predicate(record));
}

function createFallbackRecord(creationOutcomeKey: string, source: string): UnconfirmedCreationRecord {
  return {
    id: hashCreationIdentity({ source }),
    creationOutcomeKey,
    matchAny: true,
  };
}

function isUnconfirmedCreationRecord(value: unknown): value is UnconfirmedCreationRecord {
  if (!isObject(value) || typeof value.id !== "string" || !CREATION_OUTCOME_KEY_PATTERN.test(value.id)) {
    return false;
  }
  if (typeof value.creationOutcomeKey !== "string" || typeof value.matchAny !== "boolean") {
    return false;
  }

  if (value.matchAny) {
    return (
      value.retryItemKey === undefined &&
      (value.creationOutcomeKey === UNKNOWN_CREATION_OUTCOME_KEY ||
        CREATION_OUTCOME_KEY_PATTERN.test(value.creationOutcomeKey))
    );
  }

  return (
    CREATION_OUTCOME_KEY_PATTERN.test(value.creationOutcomeKey) &&
    typeof value.retryItemKey === "string" &&
    CREATION_OUTCOME_KEY_PATTERN.test(value.retryItemKey)
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function buildRetryRecurrenceIdentity(parsed: ParsedSchedule): object {
  const recurrence = parsed.recurrence;
  if (!recurrence) {
    return {};
  }

  let weekday: number | "implicit" | null = null;
  if (recurrence.frequency === "weekly") {
    const weeklySourceMatch = parsed.source.match(/(?:^|\s)매\s*주(?:\s*([월화수목금토일](?:요일|욜)?))?\s+/u);
    weekday = weeklySourceMatch
      ? weeklySourceMatch[1]
        ? (recurrence.weekday ?? null)
        : "implicit"
      : (recurrence.weekday ?? null);
  }

  return {
    frequency: recurrence.frequency,
    weekday,
    dayOfMonth: recurrence.dayOfMonth ?? null,
  };
}

function buildTimeOfDayIdentity(date: Date): object {
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    millisecond: date.getMilliseconds(),
  };
}

function localCalendarDayOffset(start: Date, end: Date): number {
  const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endDay - startDay) / (24 * 60 * 60 * 1000));
}

function hashCreationIdentity(identity: object): string {
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}
