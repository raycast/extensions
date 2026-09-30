import { describe, expect, it } from "vitest";

import {
  buildCreationOutcomeKey,
  partitionUnconfirmedCreationKeys,
  parseStoredUnconfirmedCreationKeys,
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

describe("parseStoredUnconfirmedCreationKeys", () => {
  it("loads valid keys and removes duplicates", () => {
    const first = "a".repeat(64);
    const second = "b".repeat(64);
    expect(parseStoredUnconfirmedCreationKeys(JSON.stringify([first, first, second]))).toEqual([first, second]);
  });

  it.each([undefined, null, ""])("treats %j as empty storage", (value) => {
    expect(parseStoredUnconfirmedCreationKeys(value)).toEqual([]);
  });

  it.each(["invalid", "{}", '["", "a"]', '["not-a-hash"]', 1])(
    "fails closed for malformed storage: %j",
    (value) => {
      expect(parseStoredUnconfirmedCreationKeys(value)).toEqual([UNKNOWN_CREATION_OUTCOME_KEY]);
    },
  );
});

describe("partitionUnconfirmedCreationKeys", () => {
  it("keeps an unrelated timed-out item pending", () => {
    expect(partitionUnconfirmedCreationKeys(["timed-out-item"], ["different-item"])).toEqual({
      matching: [],
      remaining: ["timed-out-item"],
    });
  });

  it("matches the timed-out item even when another batch item changed", () => {
    expect(partitionUnconfirmedCreationKeys(["timed-out-item"], ["timed-out-item", "edited-item"])).toEqual({
      matching: ["timed-out-item"],
      remaining: [],
    });
  });

  it("uses an unknown key as a fail-closed match", () => {
    expect(partitionUnconfirmedCreationKeys([UNKNOWN_CREATION_OUTCOME_KEY], ["current-item"])).toEqual({
      matching: [UNKNOWN_CREATION_OUTCOME_KEY],
      remaining: [],
    });
  });
});
