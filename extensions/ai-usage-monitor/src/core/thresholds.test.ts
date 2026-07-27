import { describe, expect, it } from "vitest";
import { UsageResult, UsageWindow } from "./models";
import { AlertState, ThresholdConfig, collectAlerts, pruneState } from "./thresholds";

const NOW = new Date("2026-07-27T15:40:00.000Z");
const CONFIG: ThresholdConfig = { session: [50, 75, 90, 95], weekly: [75, 90], resetWarnings: [30, 10] };

function window(overrides: Partial<UsageWindow> = {}): UsageWindow {
  return {
    id: "session",
    label: "Session",
    kind: "session",
    usedPercent: 0,
    resetsAt: new Date(NOW.getTime() + 3 * 3600_000),
    isPrimary: true,
    ...overrides,
  };
}

function result(windows: UsageWindow[]): UsageResult {
  return { provider: "claude", displayName: "Claude Code", windows, fetchedAt: NOW };
}

describe("collectAlerts", () => {
  it("fires every threshold already crossed on the first observation", () => {
    const { alerts } = collectAlerts([result([window({ usedPercent: 78 })])], CONFIG, {}, NOW);
    expect(alerts.map((a) => a.key)).toEqual([expect.stringContaining("t:50"), expect.stringContaining("t:75")]);
  });

  it("never repeats a threshold within the same window", () => {
    const first = collectAlerts([result([window({ usedPercent: 78 })])], CONFIG, {}, NOW);
    const second = collectAlerts([result([window({ usedPercent: 80 })])], CONFIG, first.nextState, NOW);
    expect(second.alerts).toEqual([]);
  });

  it("fires only the newly crossed threshold as usage climbs", () => {
    const first = collectAlerts([result([window({ usedPercent: 60 })])], CONFIG, {}, NOW);
    const second = collectAlerts([result([window({ usedPercent: 91 })])], CONFIG, first.nextState, NOW);
    expect(second.alerts).toHaveLength(2);
    expect(second.alerts.map((a) => a.key)).toEqual([expect.stringContaining("t:75"), expect.stringContaining("t:90")]);
  });

  it("re-arms every threshold once the window rolls over", () => {
    const before = collectAlerts([result([window({ usedPercent: 96 })])], CONFIG, {}, NOW);
    expect(before.alerts).toHaveLength(4);

    // A new reset time means a new window instance, so the same percentage alerts again.
    const rolled = window({ usedPercent: 55, resetsAt: new Date(NOW.getTime() + 8 * 3600_000) });
    const after = collectAlerts([result([rolled])], CONFIG, before.nextState, NOW);
    expect(after.alerts.map((a) => a.key)).toEqual([expect.stringContaining("t:50")]);
  });

  it("does not replay alerts when a derived reset time drifts between runs", () => {
    // Codex sometimes reports only "seconds remaining", so the absolute reset
    // time is recomputed on every fetch and lands slightly differently each
    // time. That must not read as a new window.
    const resetsAt = new Date(NOW.getTime() + 3600_000);
    const first = collectAlerts([result([window({ usedPercent: 78, resetsAt })])], CONFIG, {}, NOW);
    expect(first.alerts).toHaveLength(2);

    const later = new Date(NOW.getTime() + 600_000);
    const drifted = window({ usedPercent: 80, resetsAt: new Date(resetsAt.getTime() + 700) });
    const second = collectAlerts([result([drifted])], CONFIG, first.nextState, later);
    expect(second.alerts).toEqual([]);

    // The stored identity stays put rather than accumulating one key per run.
    expect(Object.keys(second.nextState)).toEqual(Object.keys(first.nextState));
  });

  it("does not replay alerts when a reset derived from a constant duration advances each run", () => {
    // An unconsumed Codex window reports the whole window length rather than a
    // countdown, so the reset time derived from it moves forward by the polling
    // interval on every run. Twelve scheduled runs must still alert only once.
    const WEEK_SECONDS = 604800;
    const interval = 10 * 60_000;
    let state: AlertState = {};
    let total = 0;

    for (let run = 0; run < 12; run++) {
      const at = new Date(NOW.getTime() + run * interval);
      const drifting = window({
        id: "weekly",
        label: "Weekly",
        kind: "weekly",
        usedPercent: 80,
        windowSeconds: WEEK_SECONDS,
        resetsAt: new Date(at.getTime() + WEEK_SECONDS * 1000),
      });
      const { alerts, nextState } = collectAlerts([result([drifting])], CONFIG, state, at);
      state = nextState;
      total += alerts.length;
    }

    expect(total).toBe(1);
    expect(Object.keys(state)).toHaveLength(1);
  });

  it("applies weekly thresholds to weekly windows", () => {
    const weekly = window({ id: "weekly", label: "Weekly", kind: "weekly", usedPercent: 80 });
    const { alerts } = collectAlerts([result([weekly])], CONFIG, {}, NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].key).toContain("t:75");
  });

  it("ignores scoped windows so per-model limits do not spam", () => {
    const scoped = window({ id: "weekly:Fable", kind: "scoped", usedPercent: 99, isPrimary: false });
    const { alerts } = collectAlerts([result([scoped])], CONFIG, {}, NOW);
    expect(alerts).toEqual([]);
  });

  it("warns before a reset when the window has been used", () => {
    const soon = window({ usedPercent: 60, resetsAt: new Date(NOW.getTime() + 20 * 60_000) });
    const { alerts } = collectAlerts([result([soon])], CONFIG, {}, NOW);
    const resetAlerts = alerts.filter((a) => a.key.includes("r:"));
    expect(resetAlerts).toHaveLength(1);
    expect(resetAlerts[0].key).toContain("r:30");
  });

  it("stays quiet about resets on an unused window", () => {
    const soon = window({ usedPercent: 0, resetsAt: new Date(NOW.getTime() + 5 * 60_000) });
    const { alerts } = collectAlerts([result([soon])], CONFIG, {}, NOW);
    expect(alerts).toEqual([]);
  });

  it("treats a window past its reset time as empty", () => {
    const stale = window({ usedPercent: 96, resetsAt: new Date(NOW.getTime() - 60_000) });
    const { alerts } = collectAlerts([result([stale])], CONFIG, {}, NOW);
    expect(alerts).toEqual([]);
  });

  it("honors an empty threshold list as 'no alerts'", () => {
    const config: ThresholdConfig = { session: [], weekly: [], resetWarnings: [] };
    const { alerts } = collectAlerts([result([window({ usedPercent: 99 })])], config, {}, NOW);
    expect(alerts).toEqual([]);
  });

  it("keeps state for distinct providers separate", () => {
    const claude = result([window({ usedPercent: 80 })]);
    const codex: UsageResult = { ...claude, provider: "codex", displayName: "Codex" };
    const { alerts } = collectAlerts([claude, codex], CONFIG, {}, NOW);
    expect(alerts).toHaveLength(4);
  });
});

describe("pruneState", () => {
  it("drops windows whose reset has already passed", () => {
    const state: AlertState = {
      [`claude:session:${NOW.getTime() - 1000}`]: ["t:50"],
      [`claude:weekly:${NOW.getTime() + 10_000}`]: ["t:75"],
    };
    expect(Object.keys(pruneState(state, NOW))).toEqual([`claude:weekly:${NOW.getTime() + 10_000}`]);
  });

  it("keeps windows that have no reset time", () => {
    const state: AlertState = { "claude:session:none": ["t:50"] };
    expect(pruneState(state, NOW)).toEqual(state);
  });

  it("handles ids that contain colons", () => {
    const key = `claude:weekly:Fable:${NOW.getTime() + 10_000}`;
    expect(Object.keys(pruneState({ [key]: ["t:75"] }, NOW))).toEqual([key]);
  });
});
