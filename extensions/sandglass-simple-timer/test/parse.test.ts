import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseDuration } from "../src/lib/parse.ts";

const MIN = 60_000;
const HOUR = 60 * MIN;
// Local time 14:00:00.000, so clock results do not depend on the machine's time zone.
const NOW = new Date(2026, 10, 21, 14, 0, 0, 0);

function ms(input: string): number | undefined {
  return parseDuration(input, NOW)?.ms;
}

describe("parseDuration: plain durations", () => {
  it("treats a bare number as minutes", () => {
    assert.deepEqual(parseDuration("25", NOW), { ms: 25 * MIN, kind: "duration" });
  });

  it("supports decimals", () => {
    assert.equal(ms("1.5"), 90_000);
    assert.equal(ms("1.5h"), 90 * MIN);
    assert.equal(ms("0.5m"), 30_000);
  });

  it("parses unit spellings", () => {
    for (const s of ["90s", "90 sec", "90 secs", "90 second", "90 seconds"]) assert.equal(ms(s), 90_000, s);
    for (const s of ["5m", "5 min", "5 mins", "5 minute", "5 minutes"]) assert.equal(ms(s), 5 * MIN, s);
    for (const s of ["2h", "2 hr", "2 hrs", "2 hour", "2 hours"]) assert.equal(ms(s), 2 * HOUR, s);
  });

  it("parses combinations with and without spaces", () => {
    assert.equal(ms("1h30"), 90 * MIN);
    assert.equal(ms("1h 30m"), 90 * MIN);
    assert.equal(ms("1h30m15s"), 90 * MIN + 15_000);
    assert.equal(ms("2m30s"), 150_000);
    assert.equal(ms("1 hour 30 minutes"), 90 * MIN);
    assert.equal(ms("1 h 30"), 90 * MIN);
  });

  it("is case-insensitive and tolerant of whitespace", () => {
    assert.equal(ms("  25M  "), 25 * MIN);
    assert.equal(ms("1H   30MIN"), 90 * MIN);
  });

  it("accepts exactly 24 hours", () => {
    assert.equal(ms("24h"), 24 * HOUR);
  });
});

describe("parseDuration: colon forms", () => {
  it("reads mm:ss", () => {
    assert.equal(ms("10:00"), 10 * MIN);
    assert.equal(ms("1:30"), 90_000);
  });

  it("reads h:mm:ss", () => {
    assert.equal(ms("1:30:00"), 90 * MIN);
    assert.equal(ms("0:00:45"), 45_000);
  });

  it("allows a large first part but not large later parts", () => {
    assert.equal(ms("90:00"), 90 * MIN);
    assert.equal(ms("1:75"), undefined);
    assert.equal(ms("1:30:75"), undefined);
    assert.equal(ms("1:60:00"), undefined);
  });
});

describe("parseDuration: clock forms", () => {
  it("reads 24 hour times later today", () => {
    assert.deepEqual(parseDuration("at 15:30", NOW), { ms: 90 * MIN, kind: "clock" });
    assert.equal(ms("until 15:30"), 90 * MIN);
  });

  it("reads am/pm times", () => {
    assert.equal(ms("at 3pm"), HOUR);
    assert.equal(ms("at 3:30pm"), 90 * MIN);
    assert.equal(ms("at 3:30 pm"), 90 * MIN);
    assert.equal(ms("AT 3:30 PM"), 90 * MIN);
  });

  it("treats a bare hour as that hour", () => {
    // 09:00 has passed at 14:00, so it is tomorrow: 19 hours away.
    assert.equal(ms("at 9"), 19 * HOUR);
  });

  it("rolls over to tomorrow when the time has passed", () => {
    assert.equal(ms("at 13:00"), 23 * HOUR);
    assert.equal(ms("at 1pm"), 23 * HOUR);
  });

  it("rolls over to tomorrow when it is exactly now", () => {
    assert.equal(ms("at 14:00"), 24 * HOUR);
    assert.equal(ms("at 2pm"), 24 * HOUR);
  });

  it("handles 12am and 12pm", () => {
    assert.equal(ms("at 12am"), 10 * HOUR);
    assert.equal(ms("at 12pm"), 22 * HOUR);
  });

  it("rounds up to whole seconds", () => {
    const now = new Date(2026, 10, 21, 14, 0, 0, 400);
    assert.equal(parseDuration("at 14:01", now)?.ms, 60_000);
  });

  it("rejects invalid times", () => {
    assert.equal(parseDuration("at 25:00", NOW), null);
    assert.equal(parseDuration("at 13pm", NOW), null);
    assert.equal(parseDuration("at 0pm", NOW), null);
    assert.equal(parseDuration("at 10:75", NOW), null);
  });
});

describe("parseDuration: labels", () => {
  it("takes a label before or after the duration", () => {
    assert.deepEqual(parseDuration("tea 5m", NOW), { ms: 5 * MIN, label: "Tea", kind: "duration" });
    assert.deepEqual(parseDuration("5m tea", NOW), { ms: 5 * MIN, label: "Tea", kind: "duration" });
    assert.deepEqual(parseDuration("focus 25", NOW), { ms: 25 * MIN, label: "Focus", kind: "duration" });
  });

  it("keeps multi-word labels and capitalizes only the first letter", () => {
    assert.equal(parseDuration("deep work 1h", NOW)?.label, "Deep work");
  });

  it("works with multi-part durations", () => {
    assert.deepEqual(parseDuration("tea 1 hour 30 minutes", NOW), { ms: 90 * MIN, label: "Tea", kind: "duration" });
  });

  it("works with clock times", () => {
    assert.deepEqual(parseDuration("tea at 15:30", NOW), { ms: 90 * MIN, label: "Tea", kind: "clock" });
    assert.equal(parseDuration("at 3pm call", NOW)?.label, "Call");
  });

  it("limits labels to 30 characters", () => {
    const label = parseDuration(`${"a".repeat(50)} 5m`, NOW)?.label;
    assert.equal(label?.length, 30);
  });

  it("omits the label when there is none", () => {
    assert.equal("label" in (parseDuration("5m", NOW) ?? {}), false);
  });
});

describe("parseDuration: invalid input", () => {
  it("returns null for empty or whitespace input", () => {
    assert.equal(parseDuration("", NOW), null);
    assert.equal(parseDuration("   ", NOW), null);
  });

  it("returns null for only words", () => {
    assert.equal(parseDuration("tea", NOW), null);
    assert.equal(parseDuration("at noon", NOW), null);
  });

  it("returns null for zero or negative values", () => {
    assert.equal(parseDuration("0", NOW), null);
    assert.equal(parseDuration("0m", NOW), null);
    assert.equal(parseDuration("0:00", NOW), null);
    assert.equal(parseDuration("-5", NOW), null);
  });

  it("returns null above 24 hours", () => {
    assert.equal(parseDuration("25h", NOW), null);
    assert.equal(parseDuration("1441", NOW), null);
    assert.equal(parseDuration("24h 1s", NOW), null);
  });

  it("returns null for malformed input", () => {
    assert.equal(parseDuration("abc5x", NOW), null);
    assert.equal(parseDuration("5x", NOW), null);
    assert.equal(parseDuration("5m 5m", NOW), null);
    assert.equal(parseDuration("1m30", NOW), null);
    assert.equal(parseDuration("10:00 5m", NOW), null);
    assert.equal(parseDuration("1..5", NOW), null);
  });
});
