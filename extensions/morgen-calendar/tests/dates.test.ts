import assert from "node:assert/strict";
import test from "node:test";
import { durationMinutes, eventStartDate, isoDuration, toLocalDateTime, validTimeZone } from "../src/lib/dates";

test("formats local date-time in an IANA zone without using machine zone", () => {
  assert.equal(toLocalDateTime(new Date("2026-09-25T02:30:00Z"), "Asia/Singapore"), "2026-09-25T10:30:00");
});

test("converts a Morgen event's local time to a real instant", () => {
  const actual = eventStartDate({
    id: "e", accountId: "a", calendarId: "c", title: "Event", start: "2026-09-25T10:30:00",
    timeZone: "Asia/Singapore", duration: "PT1H", showWithoutTime: false,
  });
  assert.equal(actual.toISOString(), "2026-09-25T02:30:00.000Z");
});

test("validates zone and duration values", () => {
  assert.equal(validTimeZone("Asia/Singapore"), true);
  assert.equal(validTimeZone("not-a-zone"), false);
  assert.equal(isoDuration(90), "PT1H30M");
  assert.equal(durationMinutes("PT1H30M"), 90);
  assert.throws(() => isoDuration(0));
});
