import assert from "node:assert";
import { describe, it } from "node:test";

export function isFullDay(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function formatReminderTime(reminder?: { dueDate?: string | null } | null): string {
  if (!reminder?.dueDate || isFullDay(reminder.dueDate)) {
    return "";
  }

  const date = new Date(reminder.dueDate);
  if (isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

describe("formatReminderTime", () => {
  it("returns empty string for all-day dates (YYYY-MM-DD)", () => {
    assert.strictEqual(formatReminderTime({ dueDate: "2026-09-02" }), "");
    assert.strictEqual(formatReminderTime({ dueDate: "2024-01-01" }), "");
  });

  it("returns formatted locale time for valid timed dates", () => {
    const dueDate = "2026-09-02T14:30:00.000Z";
    const expected = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dueDate));
    assert.strictEqual(formatReminderTime({ dueDate }), expected);
  });

  it("returns empty string for malformed dates", () => {
    assert.strictEqual(formatReminderTime({ dueDate: "invalid-date-string" }), "");
    assert.strictEqual(formatReminderTime({ dueDate: "not-a-date" }), "");
  });

  it("returns empty string when dueDate is missing, null, or undefined", () => {
    assert.strictEqual(formatReminderTime({ dueDate: null }), "");
    assert.strictEqual(formatReminderTime({ dueDate: "" }), "");
    assert.strictEqual(formatReminderTime({}), "");
    assert.strictEqual(formatReminderTime(null), "");
    assert.strictEqual(formatReminderTime(undefined), "");
  });
});
