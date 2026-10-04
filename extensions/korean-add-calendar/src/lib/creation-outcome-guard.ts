import { createHash, randomBytes } from "node:crypto";

import type { CalendarRecurrence } from "./apple-calendar";
import type { ParsedSchedule } from "./parse-korean-schedule";

export type CreationTarget = "calendar" | "reminder";

export const UNKNOWN_CREATION_OUTCOME_KEY = "__unknown_creation_outcome__";
const CREATION_OUTCOME_KEY_PATTERN = /^[a-f0-9]{64}$/u;
const UNCONFIRMED_CREATION_STORAGE_VERSION = 1;

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
    startEpochMs: parsed.start.getTime(),
    allDay: parsed.allDay,
  };

  return hashCreationIdentity(
    targetType === "calendar"
      ? {
          ...common,
          endEpochMs: parsed.end.getTime(),
        }
      : common,
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
): { matching: UnconfirmedCreationRecord[]; remaining: UnconfirmedCreationRecord[] } {
  const available = records.map(() => true);
  const matching: UnconfirmedCreationRecord[] = [];

  for (const candidate of candidates) {
    const matchedIndex = findAvailableRecord(records, available, (record) => {
      return !record.matchAny && record.creationOutcomeKey === candidate.creationOutcomeKey;
    });
    const fallbackExactIndex =
      matchedIndex >= 0
        ? matchedIndex
        : findAvailableRecord(records, available, (record) => {
            return record.matchAny && record.creationOutcomeKey === candidate.creationOutcomeKey;
          });
    const retryMatchedIndex =
      fallbackExactIndex >= 0
        ? fallbackExactIndex
        : findAvailableRecord(records, available, (record) => {
            return !record.matchAny && record.retryItemKey === candidate.retryItemKey;
          });
    const fallbackIndex =
      retryMatchedIndex >= 0 ? retryMatchedIndex : findAvailableRecord(records, available, (record) => record.matchAny);

    if (fallbackIndex >= 0) {
      available[fallbackIndex] = false;
      matching.push(records[fallbackIndex]);
    }
  }

  return {
    matching,
    remaining: records.filter((_, index) => available[index]),
  };
}

export function mergeUnconfirmedCreationRecords(records: UnconfirmedCreationRecord[]): UnconfirmedCreationRecord[] {
  const unique = new Map<string, UnconfirmedCreationRecord>();
  for (const record of records) {
    unique.set(record.id, record);
  }
  return [...unique.values()];
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
    if (
      !isObject(parsed) ||
      parsed.version !== UNCONFIRMED_CREATION_STORAGE_VERSION ||
      !Array.isArray(parsed.records)
    ) {
      return [createUnknownUnconfirmedCreationRecord("invalid-record-storage-schema")];
    }
    if (!parsed.records.every(isUnconfirmedCreationRecord)) {
      return [createUnknownUnconfirmedCreationRecord("invalid-record-storage-value")];
    }
    const ids = new Set(parsed.records.map((record) => record.id));
    if (ids.size !== parsed.records.length) {
      return [createUnknownUnconfirmedCreationRecord("duplicate-record-id")];
    }
    return parsed.records;
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

function hashCreationIdentity(identity: object): string {
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}
