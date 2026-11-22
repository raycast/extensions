import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { encouragement, formatClock, formatHuman, formatShort, formatTimeOfDay, greeting } from "../src/lib/format.ts";

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;

describe("formatClock", () => {
  it("pads MM:SS below one hour", () => {
    assert.equal(formatClock(5 * MIN), "05:00");
    assert.equal(formatClock(24 * MIN + 59 * SEC), "24:59");
    assert.equal(formatClock(7 * SEC), "00:07");
    assert.equal(formatClock(0), "00:00");
  });

  it("uses H:MM:SS from one hour", () => {
    assert.equal(formatClock(HOUR + 30 * MIN), "1:30:00");
    assert.equal(formatClock(HOUR), "1:00:00");
    assert.equal(formatClock(HOUR - 1), "1:00:00");
    assert.equal(formatClock(10 * HOUR + 5 * SEC), "10:00:05");
  });

  it("rounds up to whole seconds", () => {
    assert.equal(formatClock(1), "00:01");
    assert.equal(formatClock(4_001), "00:05");
    assert.equal(formatClock(59_001), "01:00");
  });

  it("never goes negative", () => {
    assert.equal(formatClock(-5000), "00:00");
  });
});

describe("formatHuman", () => {
  it("formats minutes, hours and seconds", () => {
    assert.equal(formatHuman(25 * MIN), "25 minutes");
    assert.equal(formatHuman(MIN), "1 minute");
    assert.equal(formatHuman(HOUR + 30 * MIN), "1 hour 30 minutes");
    assert.equal(formatHuman(45 * SEC), "45 seconds");
    assert.equal(formatHuman(MIN + 30 * SEC), "1 minute 30 seconds");
    assert.equal(formatHuman(2 * HOUR), "2 hours");
    assert.equal(formatHuman(SEC), "1 second");
  });

  it("omits seconds from one hour up", () => {
    assert.equal(formatHuman(HOUR + 30 * MIN + 20 * SEC), "1 hour 30 minutes");
  });

  it("handles zero", () => {
    assert.equal(formatHuman(0), "0 seconds");
  });
});

describe("formatShort", () => {
  it("formats compactly", () => {
    assert.equal(formatShort(25 * MIN), "25 min");
    assert.equal(formatShort(HOUR + 30 * MIN), "1 h 30 min");
    assert.equal(formatShort(45 * SEC), "45 sec");
    assert.equal(formatShort(MIN + 30 * SEC), "1 min 30 sec");
    assert.equal(formatShort(2 * HOUR), "2 h");
  });
});

describe("formatTimeOfDay", () => {
  it("contains the minutes, whatever the locale", () => {
    const epoch = new Date(2026, 10, 21, 15, 37).getTime();
    assert.match(formatTimeOfDay(epoch), /37/);
  });
});

describe("greeting", () => {
  const at = (hour: number) => greeting(new Date(2026, 10, 21, hour, 0));

  it("picks by hour", () => {
    assert.equal(at(5), "Good morning ☀️");
    assert.equal(at(11), "Good morning ☀️");
    assert.equal(at(12), "Good afternoon 🌤️");
    assert.equal(at(17), "Good afternoon 🌤️");
    assert.equal(at(18), "Good evening 🌙");
    assert.equal(at(22), "Good evening 🌙");
    assert.equal(at(23), "Hello, night owl ✨");
    assert.equal(at(0), "Hello, night owl ✨");
    assert.equal(at(4), "Hello, night owl ✨");
  });
});

describe("encouragement", () => {
  it("is deterministic for a running timer", () => {
    assert.equal(encouragement("running", 10 * MIN, 3), encouragement("running", 10 * MIN, 3));
  });

  it("varies with the seed and wraps around", () => {
    const lines = new Set([0, 1, 2, 3, 4].map((seed) => encouragement("running", 10 * MIN, seed)));
    assert.equal(lines.size, 5);
    assert.equal(encouragement("running", 10 * MIN, 5), encouragement("running", 10 * MIN, 0));
    assert.equal(encouragement("running", 10 * MIN, -1), encouragement("running", 10 * MIN, 1));
  });

  it("says almost there in the last minute", () => {
    assert.equal(encouragement("running", 59_999, 0), "Almost there ✨");
    assert.notEqual(encouragement("running", 60_000, 0), "Almost there ✨");
  });

  it("handles paused and finished", () => {
    assert.equal(encouragement("paused", 10 * MIN, 0), "Paused — take your time.");
    assert.equal(encouragement("finished", 0, 0), "Time's up — nice work 🎉");
  });
});
