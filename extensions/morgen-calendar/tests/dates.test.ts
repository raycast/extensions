import assert from "node:assert/strict";
import test from "node:test";
import { durationMinutes, eventStartDate, formEventTime, isoDuration, toLocalDateTime, validTimeZone } from "../src/lib/dates";

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

// macOS and Windows both expose the system zone through Intl. Exercise offsets
// on either side of UTC and DST without relying on the developer machine's zone.
for (const [zone, instant, local] of [
  ["America/Los_Angeles", "2026-01-15T02:30:00Z", "2026-01-14T18:30:00"],
  ["America/Los_Angeles", "2026-07-15T02:30:00Z", "2026-07-14T19:30:00"],
  ["Europe/London", "2026-07-15T23:30:00Z", "2026-07-16T00:30:00"],
  ["Asia/Kolkata", "2026-01-15T02:30:00Z", "2026-01-15T08:00:00"],
]) {
  test(`event times round-trip in ${zone} at ${instant}`, () => {
    assert.equal(toLocalDateTime(new Date(instant), zone), local);
    const event = {
      id: "e", accountId: "a", calendarId: "c", title: "Event",
      start: local, timeZone: zone, duration: "PT1H", showWithoutTime: false,
    };
    assert.equal(eventStartDate(event).toISOString(), new Date(instant).toISOString());
  });
}


test("manual wall times reject DST gaps and overlaps without normalization", () => {
  assert.throws(() => formEventTime(new Date("2026-03-08T12:00:00Z"), "02:30", false, "America/New_York"));
  assert.throws(() => formEventTime(new Date("2026-11-01T12:00:00Z"), "01:30", false, "America/New_York"));
  assert.equal(formEventTime(new Date("2026-03-08T12:00:00Z"), "03:30", false, "America/New_York").start, "2026-03-08T03:30:00");
});
