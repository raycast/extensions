import assert from "node:assert/strict";
import test from "node:test";
import { getStatusEmoji, getTimezoneMetadata, parseSlackTimestamp } from "./presentation";

test("empty and custom Slack statuses do not become invalid image sources", () => {
  assert.equal(getStatusEmoji(undefined), undefined);
  assert.equal(getStatusEmoji(""), undefined);
  assert.equal(getStatusEmoji(":company_logo:"), undefined);
  assert.equal(getStatusEmoji(":rocket:"), "🚀");
  assert.equal(getStatusEmoji("🎉"), "🎉");
});

test("timezone metadata handles UTC, missing, malformed, and nested zones", () => {
  const now = new Date("2026-11-12T10:00:00Z");
  assert.equal(getTimezoneMetadata("", now), undefined);
  assert.equal(getTimezoneMetadata("Not/A_Zone", now), undefined);
  assert.equal(getTimezoneMetadata("UTC", now)?.name, "UTC");
  assert.equal(getTimezoneMetadata("America/Argentina/Buenos_Aires", now)?.name, "Buenos Aires");
});

test("timestamps support seconds and fractional seconds without invalid rendered dates", () => {
  assert.equal(parseSlackTimestamp("1700000000").getTime(), 1700000000000);
  assert.equal(parseSlackTimestamp("1700000000.123456").getTime(), 1700000000123);
  assert.equal(parseSlackTimestamp("1700000000.1").getTime(), 1700000000100);
  for (const value of ["", "bad", "Infinity", "1.2.3"]) {
    assert.ok(Number.isNaN(parseSlackTimestamp(value).getTime()));
  }
});
