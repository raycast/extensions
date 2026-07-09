import { describe, it, expect } from "vitest";
import { resolveLoop } from "../../src/lib/loop";

describe("resolveLoop", () => {
  it("parses normal values", () => {
    expect(resolveLoop("5", "2")).toEqual({ times: 5, gapMs: 2000 });
  });
  it("falls back when prefs are absent, blank, or non-numeric", () => {
    expect(resolveLoop(undefined, undefined)).toEqual({ times: 3, gapMs: 1000 });
    expect(resolveLoop("", "")).toEqual({ times: 3, gapMs: 1000 });
    expect(resolveLoop("abc", "x")).toEqual({ times: 3, gapMs: 1000 });
  });
  it("preserves an intentional 0 gap (no pause between repeats)", () => {
    expect(resolveLoop("4", "0")).toEqual({ times: 4, gapMs: 0 });
  });
  it("clamps the loop count to at least 1 (0 or negative is meaningless)", () => {
    expect(resolveLoop("0", "1").times).toBe(1);
    expect(resolveLoop("-2", "1").times).toBe(1);
  });
  it("clamps a negative gap to 0 and rounds a fractional count", () => {
    expect(resolveLoop("3", "-5").gapMs).toBe(0);
    expect(resolveLoop("2.7", "1").times).toBe(3);
  });
});
