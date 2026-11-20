import { describe, expect, it } from "vitest";
import fixture from "../fixtures/profiles.json";
import { headline, summaryText } from "../../src/lib/limits";
import {
  NoUsageDataError,
  isStale,
  parseProfiles,
  requireProfiles,
  staleProfiles,
  tightestWindow,
} from "../../src/lib/profiles";

const WORK = "00000000-0000-0000-0000-000000000001";
const SECOND = "00000000-0000-0000-0000-000000000002";
/** The fixture's `lastUpdated`. */
const UPDATED = new Date("2026-11-10T15:35:54.190Z");
const minutesLater = (minutes: number) => new Date(UPDATED.getTime() + minutes * 60_000);

describe("parseProfiles", () => {
  const profiles = parseProfiles(fixture, WORK);
  const work = profiles[0];

  it("puts the active profile first and keeps the app's order for the rest", () => {
    expect(profiles.map((p) => p.profile)).toEqual([WORK, SECOND, "00000000-0000-0000-0000-000000000003"]);
    expect(profiles.map((p) => p.active)).toEqual([true, false, false]);
  });

  it("falls back to the profile selected for display when no active id is stored", () => {
    expect(parseProfiles(fixture)[0].profile).toBe(SECOND);
  });

  it("reads session and weekly limits with their reset times", () => {
    expect(work.windows[0]).toMatchObject({ id: "session", title: "5-Hour Session", usedPercent: 42 });
    expect(work.windows[0].resetsAt?.toISOString()).toBe("2026-11-10T20:35:54.190Z");
    expect(work.windows[1]).toMatchObject({ id: "weekly", title: "Weekly", usedPercent: 18, windowMinutes: 10080 });
  });

  it("keeps only the per-model limits that apply to the plan", () => {
    expect(work.windows.map((w) => w.id)).toEqual(["session", "weekly", "sonnet-weekly", "fable-weekly"]);
  });

  it("uses a model's own reset time when it has one, the weekly reset otherwise", () => {
    const weekly = work.windows[1].resetsAt;
    expect(work.windows[2].resetsAt).toEqual(weekly);
    expect(work.windows[3].resetsAt?.getTime()).toBeGreaterThan(weekly?.getTime() ?? 0);
  });

  it("converts extra usage from cents and hides it when there is no limit", () => {
    expect(work.extra).toEqual({ used: 12.5, limit: 90, currency: "EUR" });
    expect(profiles[1].extra).toBeUndefined();
  });

  it("takes only the plan name from the account data", () => {
    expect(work.plan).toBe("Max");
    expect(JSON.stringify(profiles)).not.toContain("example.com");
    expect(JSON.stringify(profiles)).not.toContain("Example");
  });

  it("drops the placeholder reset time of a session that has not started", () => {
    const session = profiles[1].windows[0];
    expect(session.usedPercent).toBe(0);
    expect(session.resetsAt).toBeUndefined();
  });

  it("names unnamed profiles by position and tolerates profiles without usage", () => {
    expect(profiles[1].name).toBe("Profile 2");
    expect(profiles[2]).toMatchObject({ name: "Fresh", windows: [], updatedAt: undefined });
  });

  it("returns nothing when the app has no profiles and rejects unexpected data", () => {
    expect(parseProfiles(undefined)).toEqual([]);
    expect(parseProfiles([null, "x", { name: "no id" }])).toEqual([]);
    expect(() => parseProfiles({ profiles: [] })).toThrow("Unexpected profile data");
  });
});

describe("requireProfiles", () => {
  it("says whether the app is missing or simply has no data yet", () => {
    expect(() => requireProfiles([], false)).toThrow("Claude Usage is not installed");
    expect(() => requireProfiles([], true)).toThrow("has not saved any usage yet");
    try {
      requireProfiles([], true);
    } catch (error) {
      expect(error).toBeInstanceOf(NoUsageDataError);
      expect((error as NoUsageDataError).appInstalled).toBe(true);
    }
  });

  it("returns saved data even when the app has been removed", () => {
    const profiles = parseProfiles(fixture, WORK);
    expect(requireProfiles(profiles, false)).toBe(profiles);
  });
});

describe("staleness", () => {
  const [work, second, fresh] = parseProfiles(fixture, WORK);

  it("trusts a reading for ten minutes", () => {
    expect(isStale(work, minutesLater(9))).toBe(false);
    expect(isStale(work, minutesLater(11))).toBe(true);
  });

  it("allows for a long refresh interval", () => {
    expect(isStale(second, minutesLater(25))).toBe(false);
    expect(isStale(second, minutesLater(31))).toBe(true);
  });

  it("does not flag a profile that has nothing to show", () => {
    expect(isStale(fresh, minutesLater(600))).toBe(false);
    expect(staleProfiles([work, second, fresh], minutesLater(11)).map((p) => p.name)).toEqual(["Work"]);
  });
});

describe("summaries", () => {
  const [work, second, fresh] = parseProfiles(fixture, WORK);
  const now = minutesLater(1);

  it("finds the limit closest to running out", () => {
    expect(tightestWindow(work)?.id).toBe("session");
    expect(tightestWindow(second)?.id).toBe("weekly");
    expect(tightestWindow(fresh)).toBeUndefined();
  });

  it("builds a one-line headline", () => {
    expect(headline(work.windows[0], "remaining", now)).toBe("5-Hour Session 58% left · resets in 4h 59m");
    expect(headline(second.windows[0], "used", now)).toBe("5-Hour Session 0% used");
  });

  it("builds a copyable summary", () => {
    const text = summaryText([work], "remaining", now);
    expect(text.split("\n")[0]).toBe("Work (Max)");
    expect(text).toContain("  Weekly: 82% left, resets in");
    expect(text).toContain("  Fable Weekly: 72% left");
  });
});
