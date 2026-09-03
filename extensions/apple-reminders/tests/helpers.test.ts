import * as assert from "node:assert";
import { describe, it } from "node:test";

import { formatReminderTime, truncate } from "../src/helpers";

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

describe("truncate", () => {
  it("does not truncate strings shorter than maxLength", () => {
    assert.strictEqual(truncate("Short string", 20), "Short string");
  });

  it("truncates ASCII strings and appends ellipsis", () => {
    assert.strictEqual(truncate("1234567890", 5), "12345…");
  });

  it("does not split multi-byte Unicode characters / emoji", () => {
    const emojiStr = "🚀🔥✨🎉❤️👍";
    assert.strictEqual(truncate(emojiStr, 3), "🚀🔥✨…");
  });
});
