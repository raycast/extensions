import assert from "node:assert/strict";
import { test } from "node:test";
import { formatLocalDate, getTimeValues, parseTime } from "../src/time.ts";

function parsed(input, unit) {
  const result = parseTime(input, unit);
  assert.ok("date" in result, JSON.stringify(result));
  return result.date;
}

test("seconds and milliseconds identify the same instant", () => {
  assert.equal(parsed("1700000000").toISOString(), "2023-11-14T22:13:20.000Z");
  assert.equal(parsed("1700000000123").toISOString(), "2023-11-14T22:13:20.123Z");
});

test("explicit units resolve ambiguous short timestamps", () => {
  assert.equal(parsed("1000", "seconds").getTime(), 1000000);
  assert.equal(parsed("1000", "milliseconds").getTime(), 1000);
  assert.equal(parsed("10000000000", "seconds").getTime(), 10000000000000);
});

test("epoch, negative timestamps, signs and surrounding whitespace", () => {
  assert.equal(parsed("0").toISOString(), "1970-01-01T00:00:00.000Z");
  assert.equal(parsed("-1").getTime(), -1000);
  assert.equal(parsed("  +0001000  ").getTime(), 1000000);
  assert.equal(getTimeValues(parsed("-1", "milliseconds"))[2].value, "-1");
});

test("ISO offsets and fractional seconds", () => {
  assert.equal(parsed("2024-02-29T08:00:00.123+08:00").toISOString(), "2024-02-29T00:00:00.123Z");
  assert.equal(parsed("2024-02-29T00:00:00.1Z").getUTCMilliseconds(), 100);
  assert.equal(parsed("2024-02-28T19:00:00-0500").toISOString(), "2024-02-29T00:00:00.000Z");
});

test("invalid dates are rejected instead of silently normalized", () => {
  for (const input of [
    "2023-02-29",
    "2024-04-31",
    "2024-00-01",
    "2024-13-01",
    "2024-01-00",
    "2024-01-01 24:00:00",
    "2024-01-01 00:60:00",
    "2024-01-01T00:00:60Z",
    "2024-01-01T00:00:00+24:00",
    "2024-01-01T00:00:00+08:60",
  ]) {
    assert.ok("error" in parseTime(input), input);
  }
});

test("invalid syntax and timestamps outside Date range", () => {
  for (const input of ["", "hello", "1.5", "1e9", "2024/01/01", "8640000000000001", "9007199254740993"]) {
    assert.ok("error" in parseTime(input), input);
  }
});

test("local date strings use local time and round trip with milliseconds", () => {
  const date = parsed("2024-02-29 12:34:56.007");
  assert.equal(date.getHours(), 12);
  assert.equal(formatLocalDate(date), "2024-02-29 12:34:56.007");
  assert.equal(parsed(formatLocalDate(date)).getTime(), date.getTime());
  assert.equal(parsed("2024-02-29").getHours(), 0);
  assert.equal(parsed("2024-02-29 12:34").getSeconds(), 0);
  assert.equal(parsed("0099-01-01T00:00:00Z").getUTCFullYear(), 99);
});

test("local zone interpretation and DST gaps", () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = "Asia/Shanghai";
    assert.equal(parsed("2024-02-29 08:00:00").toISOString(), "2024-02-29T00:00:00.000Z");
    process.env.TZ = "America/New_York";
    assert.ok("error" in parseTime("2024-03-10 02:30:00"));
    assert.equal(parsed("2024-03-10 03:30:00").toISOString(), "2024-03-10T07:30:00.000Z");
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("all output representations come from the same instant", () => {
  const values = getTimeValues(new Date("2024-02-29T00:00:00.123Z"));
  assert.equal(values.length, 4);
  assert.equal(values[1].value, "2024-02-29T00:00:00.123Z");
  assert.equal(Number(values[3].value) - Number(values[2].value) * 1000, 123);
});

test("negative and expanded years preserve their sign in local output", () => {
  for (const [year, prefix] of [
    [-1, "-000001"],
    [0, "0000"],
    [99, "0099"],
    [10000, "+010000"],
  ]) {
    const date = new Date(0);
    date.setFullYear(year, 0, 2);
    date.setHours(12, 34, 56, 789);
    assert.equal(formatLocalDate(date), `${prefix}-01-02 12:34:56.789`);
    assert.equal(parsed(formatLocalDate(date)).getTime(), date.getTime());
  }
});

test("expanded ISO dates validate the year sign", () => {
  assert.equal(parsed("-000001-01-01T00:00:00Z").getUTCFullYear(), -1);
  assert.equal(parsed("+010000-01-01T00:00:00Z").getUTCFullYear(), 10000);
  assert.ok("error" in parseTime("-000000-01-01T00:00:00Z"));
});
