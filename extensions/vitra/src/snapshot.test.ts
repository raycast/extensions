import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  deltaHoursText,
  deltaText,
  fmtHours,
  fmtSigned,
  load,
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

describe("the loader tells the four cases apart", () => {
  // These four map to four different pieces of advice on screen. Collapsing any
  // two of them sends the user to fix something that is not broken, so the
  // classification is worth testing even though the formatting is the part that
  // usually goes wrong.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vitra-load-"));
  const at = (name: string, body: string) => {
    const p = path.join(dir, name);
    fs.writeFileSync(p, body, "utf8");
    return p;
  };

  it("reads a good snapshot", () => {
    const r = load([at("ok.json", JSON.stringify(base))]);
    expect(r.kind).toBe("ok");
  });

  it("calls a file that is simply not there missing", () => {
    expect(load([path.join(dir, "nope.json")]).kind).toBe("missing");
  });

  it("keeps looking past a path that does not exist", () => {
    // Vitra's folder is "Vitra" or "vitra" depending on the machine, so an
    // ENOENT on the first candidate is the ordinary case, not a failure.
    const r = load([
      path.join(dir, "nope.json"),
      at("second.json", JSON.stringify(base)),
    ]);
    expect(r.kind).toBe("ok");
  });

  it("does not call an unreadable file missing", () => {
    // The bug this exists to prevent: a permissions or I/O error read as "no
    // snapshot yet", which tells the user to open an app that is already open
    // and already writing the file. A directory stands in for the fault — it is
    // the one read error that behaves the same on every platform.
    const sub = path.join(dir, "a-directory");
    fs.mkdirSync(sub, { recursive: true });
    const r = load([sub]);
    expect(r.kind).toBe("unreadable");
  });

  it("reports a corrupt file rather than pretending it is absent", () => {
    const r = load([at("bad.json", "{ not json")]);
    expect(r.kind).toBe("unreadable");
  });

  it("refuses a schema it was not written for", () => {
    // Rendering half of a newer shape would look like Vitra had broken a field.
    const r = load([
      at("future.json", JSON.stringify({ ...base, schema: 99 })),
    ]);
    expect(r).toEqual({ kind: "unsupported", found: 99 });
  });
});
