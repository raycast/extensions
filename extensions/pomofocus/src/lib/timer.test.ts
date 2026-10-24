import { describe, expect, it } from "vitest";
import { expire, formatRemaining, parseMinutes, pause, remaining, resume, start } from "./timer";

const T0 = 1_000_000;

describe("timer state machine", () => {
  it("start sets endsAt from now", () => {
    const s = start("focus", 60_000, T0);
    expect(s).toEqual({ status: "running", kind: "focus", durationMs: 60_000, endsAt: T0 + 60_000 });
    expect(remaining(s, T0 + 10_000)).toBe(50_000);
  });

  it("pause captures remaining time and resume continues from it", () => {
    const running = start("break", 60_000, T0);
    const paused = pause(running, T0 + 15_000);
    expect(paused).toEqual({ status: "paused", kind: "break", durationMs: 60_000, remainingMs: 45_000 });
    expect(remaining(paused, T0 + 999_999)).toBe(45_000);

    const resumed = resume(paused, T0 + 100_000);
    expect(resumed).toEqual({ status: "running", kind: "break", durationMs: 60_000, endsAt: T0 + 145_000 });
  });

  it("pause and resume are no-ops in the wrong state", () => {
    expect(pause(null, T0)).toBeNull();
    expect(resume(null, T0)).toBeNull();
    const running = start("focus", 60_000, T0);
    expect(resume(running, T0)).toBeNull();
    expect(pause(pause(running, T0), T0)).toBeNull();
    expect(pause(running, T0 + 60_000)).toBeNull();
  });

  it("expire only fires once the end is reached", () => {
    const running = start("long-break", 60_000, T0);
    expect(expire(running, T0 + 59_999)).toBeNull();
    expect(expire(running, T0 + 60_000)).toEqual({ status: "finished", kind: "long-break", durationMs: 60_000 });
    expect(expire(expire(running, T0 + 60_000), T0 + 60_000)).toBeNull();
    expect(expire(pause(running, T0), T0 + 999_999)).toBeNull();
  });

  it("remaining never goes negative", () => {
    expect(remaining(start("focus", 1000, T0), T0 + 5000)).toBe(0);
    expect(remaining(null, T0)).toBe(0);
  });
});

describe("formatRemaining", () => {
  it("rounds up to the next second", () => {
    expect(formatRemaining(0)).toBe("00:00");
    expect(formatRemaining(500)).toBe("00:01");
    expect(formatRemaining(60_000)).toBe("01:00");
    expect(formatRemaining(25 * 60_000)).toBe("25:00");
    expect(formatRemaining(24 * 60_000 + 59_001)).toBe("25:00");
    expect(formatRemaining(-5)).toBe("00:00");
  });
});

describe("parseMinutes", () => {
  it("accepts whole numbers within range", () => {
    expect(parseMinutes(" 45 ")).toEqual({ minutes: 45 });
    expect(parseMinutes("1")).toEqual({ minutes: 1 });
    expect(parseMinutes("180")).toEqual({ minutes: 180 });
  });
  it("rejects bad input", () => {
    expect(parseMinutes("0")).toHaveProperty("error");
    expect(parseMinutes("181")).toHaveProperty("error");
    expect(parseMinutes("2.5")).toHaveProperty("error");
    expect(parseMinutes("abc")).toHaveProperty("error");
    expect(parseMinutes("")).toHaveProperty("error");
  });
});
