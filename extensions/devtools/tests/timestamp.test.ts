import assert from "node:assert/strict";
import test from "node:test";
import { formatInTimeZone, parseTimestamp, parseTimeZones } from "../src/lib/timestamp";

test("seconds and milliseconds resolve to the same instant", () => {
  assert.equal(parseTimestamp("1704067200").date.toISOString(), "2024-01-01T00:00:00.000Z");
  assert.equal(parseTimestamp("1704067200000").date.toISOString(), "2024-01-01T00:00:00.000Z");
  assert.equal(parseTimestamp("1704067200.123").date.toISOString(), "2024-01-01T00:00:00.123Z");
});

test("explicit units support ambiguous early timestamps, negatives, and epoch zero", () => {
  assert.equal(parseTimestamp("1000", "milliseconds").date.toISOString(), "1970-01-01T00:00:01.000Z");
  assert.equal(parseTimestamp("1000", "seconds").date.toISOString(), "1970-01-01T00:16:40.000Z");
  assert.equal(parseTimestamp("0").date.toISOString(), "1970-01-01T00:00:00.000Z");
  assert.equal(parseTimestamp("-1").date.toISOString(), "1969-12-31T23:59:59.000Z");
});

test("IANA zones respect summer and winter daylight saving offsets", () => {
  const winter = new Date("2024-01-01T00:00:00.123Z");
  const summer = new Date("2024-07-01T00:00:00.123Z");
  assert.deepEqual(formatInTimeZone(winter, "Asia/Shanghai"), { time: "2024-01-01 08:00:00.123", offset: "UTC+08:00" });
  assert.equal(formatInTimeZone(winter, "America/Los_Angeles").offset, "UTC-08:00");
  assert.equal(formatInTimeZone(summer, "America/Los_Angeles").offset, "UTC-07:00");
  assert.equal(formatInTimeZone(winter, "UTC").time, "2024-01-01 00:00:00.123");
});

test("timezone configuration accepts commas and newlines and rejects invalid names", () => {
  assert.deepEqual(parseTimeZones(" Asia/Shanghai，UTC\nAsia/Shanghai "), ["Asia/Shanghai", "UTC"]);
  assert.throws(() => parseTimeZones("Mars/Olympus"), /Mars\/Olympus/);
  assert.throws(() => parseTimeZones(" , "));
});

test("invalid input and unsupported date ranges have a clear error", () => {
  for (const input of ["", "not a time", "NaN", "1e10", "9".repeat(30)]) assert.throws(() => parseTimestamp(input));
  assert.throws(() => parseTimestamp("8640000000000001", "milliseconds"));
});
