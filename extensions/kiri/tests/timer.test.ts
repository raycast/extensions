import { describe, expect, it } from "vitest";
import {
  cleanTask,
  formatClock,
  formatMinutes,
  formatShort,
  isDone,
  parseMinutes,
  parsePendingBreak,
  parseTimer,
  pauseTimer,
  remainingMs,
  resumeTimer,
  startTimer,
} from "../src/lib/timer";

const T0 = Date.UTC(2026, 10, 23, 9, 0, 0);

describe("timer", () => {
  it("counts down and ends", () => {
    const t = startTimer("focus", 25, T0, "id-1", "  Write   the report ", "rain");
    expect(t.endAt - t.startedAt).toBe(25 * 60_000);
    expect(t.task).toBe("Write the report");
    expect(remainingMs(t, T0 + 60_000)).toBe(24 * 60_000);
    expect(isDone(t, T0 + 25 * 60_000 - 1)).toBe(false);
    expect(isDone(t, T0 + 25 * 60_000)).toBe(true);
    expect(remainingMs(t, T0 + 99 * 60_000)).toBe(0);
  });

  it("keeps length within 1 to 120 minutes", () => {
    expect(startTimer("focus", 0, T0, "a").minutes).toBe(1);
    expect(startTimer("focus", 500, T0, "a").minutes).toBe(120);
    expect(startTimer("focus", Number.NaN, T0, "a").minutes).toBe(25);
  });

  it("pauses and resumes, moving the end by the paused time", () => {
    const t = startTimer("focus", 25, T0, "id");
    const p = pauseTimer(t, T0 + 10 * 60_000);
    expect(remainingMs(p, T0 + 60 * 60_000)).toBe(15 * 60_000);
    expect(isDone(p, T0 + 60 * 60_000)).toBe(false);
    const r = resumeTimer(p, T0 + 20 * 60_000);
    expect(r.pausedAt).toBeNull();
    expect(r.endAt).toBe(T0 + 35 * 60_000);
    expect(pauseTimer(p, T0 + 30 * 60_000)).toBe(p);
    expect(resumeTimer(r, T0)).toBe(r);
  });

  it("formats time", () => {
    expect(formatShort(25 * 60_000)).toBe("25m");
    expect(formatShort(61_000)).toBe("2m");
    expect(formatShort(45_000)).toBe("45s");
    expect(formatShort(0)).toBe("0s");
    expect(formatClock(24 * 60_000 + 5_000)).toBe("24:05");
    expect(formatClock(90 * 60_000)).toBe("1:30:00");
    expect(formatMinutes(25)).toBe("25 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(90)).toBe("1 h 30 min");
  });

  it("reads typed minutes", () => {
    expect(parseMinutes("45")).toBe(45);
    expect(parseMinutes(" 120 ")).toBe(120);
    for (const bad of ["0", "121", "4.5", "-3", "ten", "", undefined]) expect(parseMinutes(bad)).toBeNull();
  });

  it("cuts long tasks without splitting an emoji", () => {
    const long = "🌱".repeat(250);
    expect(Array.from(cleanTask(long))).toHaveLength(200);
  });

  it("reads stored timers defensively", () => {
    const t = startTimer("break", 5, T0, "id");
    expect(parseTimer(JSON.parse(JSON.stringify(t)))).toEqual(t);
    expect(parseTimer(null)).toBeNull();
    expect(parseTimer({ ...t, phase: "nap" })).toBeNull();
    expect(parseTimer({ ...t, minutes: 500 })).toBeNull();
    expect(parseTimer({ ...t, sound: "../../etc/passwd" })?.sound).toBe("");
  });

  it("forgets a waiting break after an hour", () => {
    expect(parsePendingBreak({ minutes: 5, since: T0 }, T0 + 10 * 60_000)).toEqual({ minutes: 5, since: T0 });
    expect(parsePendingBreak({ minutes: 5, since: T0 }, T0 + 61 * 60_000)).toBeNull();
    expect(parsePendingBreak({ minutes: 0, since: T0 }, T0)).toBeNull();
  });
});
