import { describe, it, expect } from "vitest";
import {
  deltaHoursText,
  deltaText,
  fmtHours,
  fmtSigned,
  relativeTime,
  summaryLine,
} from "./snapshot";
import type { Snapshot } from "./snapshot";

// The formatting is where this extension can actually be wrong. The JSX either
// renders or it does not; a delta that disagrees with the number printed above
// it looks fine and is wrong, which is the failure worth testing for.

const base: Snapshot = {
  schema: 1,
  generatedAt: new Date().toISOString(),
  appVersion: "0.14.0",
  day: "2026-09-02",
  scoresWithheld: false,
  flags: { pacedHeart: false },
  scores: { readiness: 68, sleep: 64, activity: 77 },
  measurements: {
    hrvMs: 20,
    restingHr: 66,
    sleepHours: 5.52,
    steps: 1489,
    tempDeviationC: -0.27,
    spo2: 97.8,
  },
  baselines: { readiness: 70, hrvMs: 27, restingHr: 67, sleepHours: 5.55 },
};

describe("durations read the same way twice", () => {
  it("shows sleep as hours and minutes", () => {
    expect(fmtHours(5.52)).toBe("5h 31m");
    expect(fmtHours(6)).toBe("6h 00m");
    expect(fmtHours(null)).toBe("—");
  });

  it("gives the sleep delta in the same units as the sleep value", () => {
    // The bug this exists to prevent: "+0.1h vs usual" printed underneath
    // "5h 31m". One quantity, two notations, and no way for the reader to check
    // one against the other.
    expect(deltaHoursText(5.52, 5.55)).toBe("−2m vs usual");
    expect(deltaHoursText(7.0, 5.5)).toBe("+1h 30m vs usual");
    expect(deltaHoursText(5.52, 5.52)).toBe("same as usual");
    expect(deltaHoursText(5.52, null)).toBeUndefined();
  });

  it("derives deltas from the rounded values that are on screen", () => {
    // 68 against 70 is −2 whether or not the underlying numbers were tidy.
    expect(deltaText(68, 70)).toBe("\u22122 vs usual");
    expect(deltaText(20, 27, " ms")).toBe("\u22127 ms vs usual");
    // Values that display identically must not claim a difference.
    expect(deltaText(66.4, 66.2, " bpm")).toBe("same as usual");
  });

  it("marks a positive difference and leaves a negative one alone", () => {
    expect(fmtSigned(3)).toBe("+3");
    expect(fmtSigned(-3)).toBe("\u22123");
    expect(fmtSigned(0)).toBe("0");
    // Same glyph as the duration deltas — never a hyphen in one and a minus in
    // the other, in the same list.
    expect(fmtSigned(-3).charAt(0)).toBe(deltaHoursText(5, 5.05)!.charAt(0));
  });
});

describe("the summary says only what it is allowed to", () => {
  it("includes the scores when they are available", () => {
    expect(summaryLine(base)).toBe(
      "Readiness 68 · Sleep 64 · 5h 31m asleep · HRV 20 ms",
    );
  });

  it("drops the scores when Vitra is withholding them", () => {
    // Blind check-in: the scores must not reach a surface outside the app
    // before the day has been rated. Copying a summary is such a surface.
    const held = {
      ...base,
      scoresWithheld: true,
      scores: { readiness: null, sleep: null, activity: null },
    };
    const line = summaryLine(held);
    expect(line).not.toMatch(/Readiness|Sleep \d/);
    expect(line).toBe("5h 31m asleep · HRV 20 ms");
  });

  it("says so plainly when there is nothing yet", () => {
    const empty: Snapshot = {
      ...base,
      scores: { readiness: null, sleep: null, activity: null },
      measurements: {
        hrvMs: null,
        restingHr: null,
        sleepHours: null,
        steps: null,
        tempDeviationC: null,
        spo2: null,
      },
    };
    expect(summaryLine(empty)).toBe("No Vitra data yet");
  });
});

describe("staleness is described honestly", () => {
  it("reads recent times in minutes and older ones in hours or days", () => {
    const ago = (ms: number) =>
      relativeTime(new Date(Date.now() - ms).toISOString());
    expect(ago(30_000)).toBe("just now");
    expect(ago(12 * 60_000)).toBe("12 min ago");
    expect(ago(3 * 3_600_000)).toBe("3h ago");
    expect(ago(2 * 86_400_000)).toBe("2d ago");
  });

  it("never reports a negative age from a clock skew", () => {
    expect(relativeTime(new Date(Date.now() + 60_000).toISOString())).toBe(
      "just now",
    );
  });
});
