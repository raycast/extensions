import { describe, expect, it } from "vitest";
import {
  allPlatformPicks,
  formatExactHour,
  formatRelative,
  formatWindow,
  formatWindowCompact,
  jsToBufferDay,
  lookupIntensity,
  platformPicks,
  reformatTimesInProse,
} from "./compute";
import { PLATFORMS, platformById } from "./heatmaps";

// All scenarios pin "now" to a known local moment so the tests are
// deterministic regardless of when CI runs.
const FRI_2030 = new Date("2026-05-22T14:30:00"); // Friday 14:30 local

describe("jsToBufferDay", () => {
  // JS getDay(): 0=Sun..6=Sat   →   Buffer index: 0=Mon..6=Sun
  it("converts JS Sunday (0) to Buffer index 6", () => {
    expect(jsToBufferDay(0)).toBe(6);
  });
  it("converts JS Monday (1) to Buffer index 0", () => {
    expect(jsToBufferDay(1)).toBe(0);
  });
  it("converts JS Saturday (6) to Buffer index 5", () => {
    expect(jsToBufferDay(6)).toBe(5);
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-05-22T14:30:00");
  const mins = (n: number) => new Date(now.getTime() + n * 60_000);
  const hrs = (n: number) => new Date(now.getTime() + n * 3600_000);

  it("returns 'now' for the present moment", () => {
    expect(formatRelative(now, now)).toBe("now");
  });
  it("returns 'in <m>m' for sub-hour deltas", () => {
    expect(formatRelative(now, mins(30))).toBe("in 30m");
  });
  it("returns whole hours without minutes", () => {
    expect(formatRelative(now, hrs(2))).toBe("in 2h");
  });
  it("returns hours plus minutes when both present", () => {
    expect(formatRelative(now, hrs(1.5))).toBe("in 1h 30m");
  });
  it("returns whole days without hours", () => {
    expect(formatRelative(now, hrs(48))).toBe("in 2d");
  });
  it("returns days plus hours when both present", () => {
    expect(formatRelative(now, hrs(27))).toBe("in 1d 3h");
  });
  it("clamps negative deltas to 'now'", () => {
    expect(formatRelative(now, mins(-5))).toBe("now");
  });
});

describe("formatExactHour", () => {
  // 22 May 2026 is a Friday, so hour 15 → "Fri 3 p.m." / "Fri 15:00"
  const fri3pm = new Date("2026-05-22T15:00:00");
  const sun9am = new Date("2026-05-24T09:00:00");

  it("ampm: single-digit afternoon", () => {
    expect(formatExactHour(fri3pm, "ampm")).toBe("Fri 3 p.m.");
  });
  it("ampm: single-digit morning", () => {
    expect(formatExactHour(sun9am, "ampm")).toBe("Sun 9 a.m.");
  });
  it("24h: zero-padded with explicit :00", () => {
    expect(formatExactHour(fri3pm, "24h")).toBe("Fri 15:00");
    expect(formatExactHour(sun9am, "24h")).toBe("Sun 09:00");
  });
});

describe("formatWindow", () => {
  // We synthesise Window objects rather than relying on findWindows, so
  // the unit under test is just the formatter.
  const platform = PLATFORMS[0];
  const fri3pm = new Date("2026-05-22T15:00:00");
  const sun11am = new Date("2026-05-24T11:00:00");

  it("ampm: single hour collapses to one time string", () => {
    expect(
      formatWindow({ platform, start: fri3pm, hours: 1, intensity: 3 }, "ampm"),
    ).toBe("Fri 3 p.m.");
  });
  it("ampm: range within one half collapses the meridiem", () => {
    // Fri 3pm to Fri 6pm → "Fri 3–6 p.m." (one shared p.m.)
    expect(
      formatWindow({ platform, start: fri3pm, hours: 4, intensity: 3 }, "ampm"),
    ).toBe("Fri 3–6 p.m.");
  });
  it("ampm: cross-meridiem range keeps both meridiems", () => {
    // Sun 11am to Sun 1pm → "Sun 11 a.m.–1 p.m."
    expect(
      formatWindow(
        { platform, start: sun11am, hours: 3, intensity: 2 },
        "ampm",
      ),
    ).toBe("Sun 11 a.m.–1 p.m.");
  });
  it("24h: ranges use start:00–end:00 with leading zeros", () => {
    expect(
      formatWindow({ platform, start: fri3pm, hours: 4, intensity: 3 }, "24h"),
    ).toBe("Fri 15:00–18:00");
    expect(
      formatWindow({ platform, start: sun11am, hours: 3, intensity: 2 }, "24h"),
    ).toBe("Sun 11:00–13:00");
  });
});

describe("formatWindowCompact", () => {
  const platform = PLATFORMS[0];
  const fri3pm = new Date("2026-05-22T15:00:00");
  const sun11am = new Date("2026-05-24T11:00:00");

  it("ampm: single hour uses tight 1-letter meridiem", () => {
    expect(
      formatWindowCompact(
        { platform, start: fri3pm, hours: 1, intensity: 3 },
        "ampm",
      ),
    ).toBe("Fri 3p");
  });
  it("ampm: shared-meridiem range collapses to one suffix", () => {
    expect(
      formatWindowCompact(
        { platform, start: fri3pm, hours: 4, intensity: 3 },
        "ampm",
      ),
    ).toBe("Fri 3–6p");
  });
  it("ampm: cross-meridiem range keeps both suffixes", () => {
    expect(
      formatWindowCompact(
        { platform, start: sun11am, hours: 3, intensity: 2 },
        "ampm",
      ),
    ).toBe("Sun 11a–1p");
  });
  it("24h: identical to formatWindow (no compact form)", () => {
    const w = { platform, start: fri3pm, hours: 4, intensity: 3 as const };
    expect(formatWindowCompact(w, "24h")).toBe(formatWindow(w, "24h"));
  });
});

describe("reformatTimesInProse", () => {
  it("is a no-op for ampm mode", () => {
    expect(reformatTimesInProse("Evenings 6–11 p.m.", "ampm")).toBe(
      "Evenings 6–11 p.m.",
    );
  });
  it("converts a p.m. range to 24h", () => {
    expect(reformatTimesInProse("Evenings 6–11 p.m.", "24h")).toBe(
      "Evenings 18:00–23:00",
    );
  });
  it("converts an a.m. range to 24h", () => {
    expect(reformatTimesInProse("Avoid 6–11 a.m.", "24h")).toBe(
      "Avoid 06:00–11:00",
    );
  });
  it("handles a singleton p.m. with no period dots", () => {
    expect(reformatTimesInProse("6pm spike most days.", "24h")).toBe(
      "18:00 spike most days.",
    );
  });
  it("handles the 12 → noon / midnight edge case", () => {
    expect(reformatTimesInProse("Around 12 p.m.", "24h")).toBe("Around 12:00");
    expect(reformatTimesInProse("Around 12 a.m.", "24h")).toBe("Around 00:00");
  });
  it("leaves prose untouched when it has no times", () => {
    expect(reformatTimesInProse("Weekends underperform.", "24h")).toBe(
      "Weekends underperform.",
    );
  });
});

describe("lookupIntensity + platformPicks", () => {
  const linkedin = platformById("linkedin")!;

  it("looks up a specific cell intensity", () => {
    // LinkedIn Wed 16:00 is encoded as the explicit '#' peak.
    const wed4pm = new Date("2026-05-20T16:00:00"); // Wed
    expect(lookupIntensity(linkedin.heatmap, wed4pm)).toBe(3);
  });

  it("returns the soonest # as bestHour", () => {
    // At Fri 14:30 the soonest LinkedIn # is Fri 15:00.
    const picks = platformPicks(linkedin, FRI_2030);
    expect(picks.bestHour).not.toBeNull();
    expect(picks.bestHour!.when.getHours()).toBe(15);
    expect(picks.bestHour!.when.getDay()).toBe(5); // Friday
  });

  it("returns up to N chronologically-ordered good-or-better windows", () => {
    const picks = platformPicks(linkedin, FRI_2030, 3);
    expect(picks.windows.length).toBeLessThanOrEqual(3);
    // Windows must be strictly chronologically ordered.
    for (let i = 1; i < picks.windows.length; i++) {
      expect(picks.windows[i].start.getTime()).toBeGreaterThan(
        picks.windows[i - 1].start.getTime(),
      );
    }
    // First window includes Fri 15:00 because that's where LinkedIn's good
    // block opens at this hour and continues.
    expect(picks.windows[0].start.getHours()).toBeLessThanOrEqual(15);
  });

  it("the best window's max intensity is 3 when it contains the peak", () => {
    const picks = platformPicks(linkedin, FRI_2030);
    const bestWindow = picks.windows.find((w) => w.intensity === 3);
    expect(bestWindow).toBeDefined();
  });
});

describe("allPlatformPicks", () => {
  it("defaults: sorts platforms by soonest peak", () => {
    const all = allPlatformPicks(FRI_2030);
    // The earliest peak across all platforms at Fri 14:30 is LinkedIn Fri 15:00.
    expect(all[0].platform.id).toBe("linkedin");
    // Picks should be chronologically ordered by bestHour.
    const peakTimes = all
      .filter((p) => p.bestHour !== null)
      .map((p) => p.bestHour!.when.getTime());
    for (let i = 1; i < peakTimes.length; i++) {
      expect(peakTimes[i]).toBeGreaterThanOrEqual(peakTimes[i - 1]);
    }
  });

  it("honours user-provided platform order and filters out unknowns", () => {
    const all = allPlatformPicks(FRI_2030, [
      "x",
      "linkedin",
      "bogus-id",
      "facebook",
    ]);
    expect(all.map((p) => p.platform.id)).toEqual([
      "x",
      "linkedin",
      "facebook",
    ]);
  });

  it("returns an empty list when given an empty platform list", () => {
    // Empty array means "no filter" — i.e. default behaviour, all platforms.
    expect(allPlatformPicks(FRI_2030, []).length).toBe(PLATFORMS.length);
  });
});
