import { describe, expect, it } from "vitest";

import {
  buildCreationOutcomeKey,
  buildRetryItemKey,
  createUnconfirmedCreationRecord,
  mergeLoadedUnconfirmedCreationRecords,
  mergeUnconfirmedCreationRecords,
  migrateStoredUnconfirmedCreationKeys,
  parseStoredUnconfirmedCreationRecords,
  partitionUnconfirmedCreationRecords,
  serializeUnconfirmedCreationRecords,
  UNKNOWN_CREATION_OUTCOME_KEY,
} from "../src/lib/creation-outcome-guard";
import type { ParsedSchedule } from "../src/lib/parse-korean-schedule";

const parsed: ParsedSchedule = {
  title: "Team meeting",
  start: new Date(2026, 1, 18, 15, 0),
  end: new Date(2026, 1, 18, 16, 0),
  allDay: false,
  location: "Meeting Room A",
  source: "내일 오후 3시 팀 회의",
  intent: "event",
};

describe("buildCreationOutcomeKey", () => {
  it("keeps the key stable when only the source sentence changes", () => {
    const first = buildCreationOutcomeKey({ targetType: "calendar", parsed });
    const retry = buildCreationOutcomeKey({
      targetType: "calendar",
      parsed: { ...parsed, source: "2026년 2월 18일 15:00부터 16:00까지 팀 회의" },
    });

    expect(retry).toBe(first);
    expect(first).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("keeps different locations and recurrence settings distinct", () => {
    const first = buildCreationOutcomeKey({
      targetType: "calendar",
      parsed,
      recurrence: { frequency: "daily", end: { type: "count", count: 10 } },
    });
    const changedLocation = buildCreationOutcomeKey({
      targetType: "calendar",
      parsed: { ...parsed, location: "Meeting Room B" },
      recurrence: { frequency: "daily", end: { type: "count", count: 10 } },
    });
    const changedRecurrence = buildCreationOutcomeKey({
      targetType: "calendar",
      parsed,
      recurrence: { frequency: "daily", end: { type: "count", count: 5 } },
    });

    expect(changedLocation).not.toBe(first);
    expect(changedRecurrence).not.toBe(first);
  });

  it("distinguishes changed items and target types", () => {
    const calendar = buildCreationOutcomeKey({ targetType: "calendar", parsed });
    const changedTitle = buildCreationOutcomeKey({
      targetType: "calendar",
      parsed: { ...parsed, title: "Client meeting" },
    });
    const reminder = buildCreationOutcomeKey({ targetType: "reminder", parsed });

    expect(changedTitle).not.toBe(calendar);
    expect(reminder).not.toBe(calendar);
  });
});

describe("unconfirmed creation records", () => {
  it("matches a recurring retry after its resolved occurrence moves", () => {
    const recurrence = { frequency: "daily" as const, end: { type: "count" as const, count: 10 } };
    const originalParsed: ParsedSchedule = {
      ...parsed,
      source: "매일 오후 3시 Team meeting",
      recurrence: { frequency: "daily" },
    };
    const laterParsed: ParsedSchedule = {
      ...originalParsed,
      start: new Date(2026, 1, 19, 15, 0),
      end: new Date(2026, 1, 19, 16, 0),
    };
    const originalCreationKey = buildCreationOutcomeKey({
      targetType: "calendar",
      parsed: originalParsed,
      recurrence,
    });
    const laterCreationKey = buildCreationOutcomeKey({
      targetType: "calendar",
      parsed: laterParsed,
      recurrence,
    });
    const record = createUnconfirmedCreationRecord(
      originalCreationKey,
      buildRetryItemKey("calendar", originalParsed),
    );
    const reloaded = parseStoredUnconfirmedCreationRecords(serializeUnconfirmedCreationRecords([record]));

    const partition = partitionUnconfirmedCreationRecords(reloaded, [
      {
        creationOutcomeKey: laterCreationKey,
        retryItemKey: buildRetryItemKey("calendar", laterParsed),
      },
    ]);

    expect(laterCreationKey).not.toBe(originalCreationKey);
    expect(buildRetryItemKey("calendar", laterParsed)).toBe(buildRetryItemKey("calendar", originalParsed));
    expect(partition.matching.map((item) => item.id)).toEqual([record.id]);
    expect(partition.remaining).toEqual([record]);
  });

  it("keeps non-recurring retries on different dates distinct", () => {
    const nextDay = {
      ...parsed,
      start: new Date(2026, 1, 19, 15, 0),
      end: new Date(2026, 1, 19, 16, 0),
    };

    expect(buildRetryItemKey("calendar", nextDay)).not.toBe(buildRetryItemKey("calendar", parsed));
  });

  it("keeps explicit recurrence patterns distinct and implicit weekly retries stable", () => {
    const implicitTuesday: ParsedSchedule = {
      ...parsed,
      source: "매주 오후 3시 Team meeting",
      recurrence: { frequency: "weekly", weekday: 2 },
    };
    const implicitWednesday: ParsedSchedule = {
      ...implicitTuesday,
      start: new Date(2026, 1, 19, 15, 0),
      end: new Date(2026, 1, 19, 16, 0),
      recurrence: { frequency: "weekly", weekday: 3 },
    };
    const explicitTuesday = {
      ...implicitTuesday,
      source: "매주 화요일 오후 3시 Team meeting",
    };
    const explicitWednesday = {
      ...implicitWednesday,
      source: "매주 수요일 오후 3시 Team meeting",
    };

    expect(buildRetryItemKey("calendar", implicitWednesday)).toBe(buildRetryItemKey("calendar", implicitTuesday));
    expect(buildRetryItemKey("calendar", explicitWednesday)).not.toBe(
      buildRetryItemKey("calendar", explicitTuesday),
    );
    expect(buildRetryItemKey("calendar", explicitTuesday)).not.toBe(
      buildRetryItemKey("calendar", { ...explicitTuesday, recurrence: { frequency: "daily" } }),
    );
  });

  it("warns on an option-edited retry without consuming the ambiguous record", () => {
    const editedParsed = {
      ...parsed,
      location: "Meeting Room B",
      source: "2026년 2월 18일 15:00부터 16:00까지 팀 회의",
    };
    const originalKey = buildCreationOutcomeKey({
      targetType: "calendar",
      parsed,
      recurrence: { frequency: "daily", end: { type: "count", count: 10 } },
    });
    const editedKey = buildCreationOutcomeKey({
      targetType: "calendar",
      parsed: editedParsed,
      recurrence: { frequency: "daily", end: { type: "count", count: 5 } },
    });
    const retryItemKey = buildRetryItemKey("calendar", parsed);
    const editedRetryItemKey = buildRetryItemKey("calendar", editedParsed);
    const record = createUnconfirmedCreationRecord(originalKey, retryItemKey);
    const reloaded = parseStoredUnconfirmedCreationRecords(serializeUnconfirmedCreationRecords([record]));

    const partition = partitionUnconfirmedCreationRecords(reloaded, [
      { creationOutcomeKey: editedKey, retryItemKey: editedRetryItemKey },
    ]);

    expect(editedKey).not.toBe(originalKey);
    expect(editedRetryItemKey).toBe(retryItemKey);
    expect(partition.matching.map((item) => item.id)).toEqual([record.id]);
    expect(partition.remaining).toEqual([record]);
  });

  it("does not let a different item clear the original warning through a shared retry key", () => {
    const originalKey = buildCreationOutcomeKey({
      targetType: "calendar",
      parsed,
      recurrence: { frequency: "daily", end: { type: "count", count: 10 } },
    });
    const retryItemKey = buildRetryItemKey("calendar", parsed);
    const record = createUnconfirmedCreationRecord(originalKey, retryItemKey);
    const otherParsed = { ...parsed, location: "Meeting Room B" };
    const otherCandidate = {
      creationOutcomeKey: buildCreationOutcomeKey({
        targetType: "calendar" as const,
        parsed: otherParsed,
        recurrence: { frequency: "daily", end: { type: "count", count: 5 } },
      }),
      retryItemKey: buildRetryItemKey("calendar", otherParsed),
    };

    const otherPartition = partitionUnconfirmedCreationRecords([record], [otherCandidate]);
    const originalPartition = partitionUnconfirmedCreationRecords(otherPartition.remaining, [
      { creationOutcomeKey: originalKey, retryItemKey },
    ]);

    expect(otherCandidate.creationOutcomeKey).not.toBe(originalKey);
    expect(otherCandidate.retryItemKey).toBe(retryItemKey);
    expect(otherPartition.matching).toEqual([record]);
    expect(otherPartition.remaining).toEqual([record]);
    expect(originalPartition.matching).toEqual([record]);
    expect(originalPartition.remaining).toEqual([]);
  });

  it("does not bind another item or target type", () => {
    const record = createUnconfirmedCreationRecord(
      buildCreationOutcomeKey({ targetType: "calendar", parsed }),
      buildRetryItemKey("calendar", parsed),
    );
    const changedParsed = { ...parsed, title: "Client meeting" };

    expect(
      partitionUnconfirmedCreationRecords(
        [record],
        [
          {
            creationOutcomeKey: buildCreationOutcomeKey({ targetType: "calendar", parsed: changedParsed }),
            retryItemKey: buildRetryItemKey("calendar", changedParsed),
          },
        ],
      ),
    ).toEqual({ matching: [], remaining: [record] });
    expect(
      partitionUnconfirmedCreationRecords(
        [record],
        [
          {
            creationOutcomeKey: buildCreationOutcomeKey({ targetType: "reminder", parsed }),
            retryItemKey: buildRetryItemKey("reminder", parsed),
          },
        ],
      ),
    ).toEqual({ matching: [], remaining: [record] });
  });

  it("keeps identical unknown batch operations as separate records", () => {
    const creationOutcomeKey = "a".repeat(64);
    const retryItemKey = "b".repeat(64);
    const first = createUnconfirmedCreationRecord(creationOutcomeKey, retryItemKey);
    const second = createUnconfirmedCreationRecord(creationOutcomeKey, retryItemKey);
    const records = mergeUnconfirmedCreationRecords([first, second]);

    const partition = partitionUnconfirmedCreationRecords(records, [
      { creationOutcomeKey, retryItemKey },
      { creationOutcomeKey, retryItemKey },
    ]);

    expect(first.id).not.toBe(second.id);
    expect(records).toHaveLength(2);
    expect(partition.matching.map((item) => item.id)).toEqual([first.id, second.id]);
    expect(partition.remaining).toEqual([]);
  });

  it("prefers an exact strict key over another record's retry key", () => {
    const retryItemKey = "c".repeat(64);
    const first = createUnconfirmedCreationRecord("a".repeat(64), retryItemKey);
    const second = createUnconfirmedCreationRecord("b".repeat(64), retryItemKey);

    const partition = partitionUnconfirmedCreationRecords(
      [first, second],
      [{ creationOutcomeKey: second.creationOutcomeKey, retryItemKey }],
    );

    expect(partition.matching.map((item) => item.id)).toEqual([second.id]);
    expect(partition.remaining.map((item) => item.id)).toEqual([first.id]);
  });

  it("prioritizes a later exact candidate over an earlier relaxed candidate", () => {
    const retryItemKey = "c".repeat(64);
    const record = createUnconfirmedCreationRecord("a".repeat(64), retryItemKey);

    const partition = partitionUnconfirmedCreationRecords(
      [record],
      [
        { creationOutcomeKey: "b".repeat(64), retryItemKey },
        { creationOutcomeKey: record.creationOutcomeKey, retryItemKey },
      ],
    );

    expect(partition.matching).toEqual([record]);
    expect(partition.remaining).toEqual([]);
  });

  it("prefers an exact migrated key over another record's retry key", () => {
    const retryItemKey = "c".repeat(64);
    const current = createUnconfirmedCreationRecord("a".repeat(64), retryItemKey);
    const migrated = migrateStoredUnconfirmedCreationKeys(JSON.stringify(["b".repeat(64)]), "legacy")[0];
    expect(migrated).toBeDefined();
    if (!migrated) {
      throw new Error("Expected a migrated record");
    }

    const partition = partitionUnconfirmedCreationRecords(
      [current, migrated],
      [{ creationOutcomeKey: migrated.creationOutcomeKey, retryItemKey }],
    );

    expect(partition.matching.map((item) => item.id)).toEqual([migrated.id]);
    expect(partition.remaining.map((item) => item.id)).toEqual([current.id]);
  });
});

describe("unconfirmed creation storage", () => {
  it("round-trips versioned records", () => {
    const record = createUnconfirmedCreationRecord("a".repeat(64), "b".repeat(64));

    expect(parseStoredUnconfirmedCreationRecords(serializeUnconfirmedCreationRecords([record]))).toEqual([record]);
  });

  it.each([undefined, null, ""])("treats %j as empty storage", (value) => {
    expect(parseStoredUnconfirmedCreationRecords(value)).toEqual([]);
  });

  it.each(["invalid", "{}", '{"version":3,"records":[]}', '{"version":1,"records":[{}]}'])(
    "fails closed for malformed storage: %s",
    (value) => {
      const records = parseStoredUnconfirmedCreationRecords(value);
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        creationOutcomeKey: UNKNOWN_CREATION_OUTCOME_KEY,
        matchAny: true,
      });
    },
  );

  it("fails closed when record identifiers are duplicated", () => {
    const record = createUnconfirmedCreationRecord("a".repeat(64), "b".repeat(64));
    const stored = JSON.stringify({ version: 1, records: [record, record] });

    const records = parseStoredUnconfirmedCreationRecords(stored);

    expect(records).toHaveLength(1);
    expect(records[0]?.creationOutcomeKey).toBe(UNKNOWN_CREATION_OUTCOME_KEY);
  });

  it("migrates version 1 records without collapsing separate warnings", () => {
    const first = createUnconfirmedCreationRecord("a".repeat(64), "c".repeat(64));
    const second = createUnconfirmedCreationRecord("b".repeat(64), "d".repeat(64));
    const stored = JSON.stringify({ version: 1, records: [first, second] });

    const records = parseStoredUnconfirmedCreationRecords(stored);
    const partition = partitionUnconfirmedCreationRecords(records, [
      { creationOutcomeKey: "e".repeat(64), retryItemKey: "f".repeat(64) },
    ]);

    expect(records).toHaveLength(2);
    expect(records.every((record) => record.matchAny)).toBe(true);
    expect(partition.matching).toHaveLength(1);
    expect(partition.remaining).toHaveLength(1);
  });
});

describe("legacy warning migration", () => {
  it("preserves an unconsumed warning across migration, storage reload, and a later retry", () => {
    const firstKey = "a".repeat(64);
    const secondKey = "b".repeat(64);
    const migrated = migrateStoredUnconfirmedCreationKeys(JSON.stringify([firstKey, secondKey]), "legacy");
    const reloaded = parseStoredUnconfirmedCreationRecords(
      serializeUnconfirmedCreationRecords(mergeLoadedUnconfirmedCreationRecords([], migrated)),
    );

    const firstRetry = partitionUnconfirmedCreationRecords(reloaded, [
      { creationOutcomeKey: "c".repeat(64), retryItemKey: "d".repeat(64) },
    ]);
    const remainingAfterRestart = parseStoredUnconfirmedCreationRecords(
      serializeUnconfirmedCreationRecords(firstRetry.remaining),
    );
    const secondRetry = partitionUnconfirmedCreationRecords(remainingAfterRestart, [
      { creationOutcomeKey: "e".repeat(64), retryItemKey: "f".repeat(64) },
    ]);

    expect(firstRetry.matching).toHaveLength(1);
    expect(firstRetry.remaining).toHaveLength(1);
    expect(firstRetry.remaining[0]?.creationOutcomeKey).toBe(secondKey);
    expect(secondRetry.matching).toHaveLength(1);
    expect(secondRetry.matching[0]?.creationOutcomeKey).toBe(secondKey);
    expect(secondRetry.remaining).toEqual([]);
  });

  it("preserves separate legacy warnings and consumes one per submitted item", () => {
    const firstKey = "a".repeat(64);
    const secondKey = "b".repeat(64);
    const records = migrateStoredUnconfirmedCreationKeys(JSON.stringify([firstKey, secondKey]), "legacy");

    const partition = partitionUnconfirmedCreationRecords(records, [
      { creationOutcomeKey: "c".repeat(64), retryItemKey: "d".repeat(64) },
    ]);

    expect(records).toHaveLength(2);
    expect(partition.matching).toHaveLength(1);
    expect(partition.remaining).toHaveLength(1);
    expect(partition.remaining[0]?.creationOutcomeKey).toBe(secondKey);
  });

  it("does not duplicate a migrated key already represented by a current record", () => {
    const current = createUnconfirmedCreationRecord("a".repeat(64), "c".repeat(64));
    const migrated = migrateStoredUnconfirmedCreationKeys(JSON.stringify(["a".repeat(64), "b".repeat(64)]), "legacy");

    const merged = mergeLoadedUnconfirmedCreationRecords([current], migrated);

    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual(current);
    expect(merged[1]).toMatchObject({
      creationOutcomeKey: "b".repeat(64),
      matchAny: true,
    });
  });

  it("turns malformed legacy storage into one fail-closed record", () => {
    const records = migrateStoredUnconfirmedCreationKeys("invalid", "legacy");

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      creationOutcomeKey: UNKNOWN_CREATION_OUTCOME_KEY,
      matchAny: true,
    });
  });
});
