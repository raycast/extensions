import { describe, expect, it } from "vitest";
import { AMBER, RED } from "../src/lib/ring";
import { deriveView, effectiveWindow, NOT_CONNECTED, parseThresholds, WAITING, type ViewPrefs } from "../src/lib/view";
import type { Usage, UsageState } from "../src/types";

const prefs: ViewPrefs = { ringMode: "session", showPercentText: false, warnThreshold: "60", critThreshold: "85" };
const NOW = new Date("2026-11-02T14:16:00Z").getTime();
const MIN = 60_000;
const decode = (uri: string) => Buffer.from(uri.split(",")[1], "base64").toString();

const usage = (five = 8, week = 6, over: Partial<Usage> = {}): Usage => ({
  fiveHour: { utilization: five, resetsAt: "2026-11-02T16:30:00.000Z" },
  sevenDay: { utilization: week, resetsAt: "2026-11-07T19:00:00.000Z" },
  fetchedAt: NOW - MIN,
  ...over,
});
const state = (u: Usage | null = usage(), connected = true): UsageState => ({ connected, usage: u });

describe("parseThresholds", () => {
  it("defaults on garbage, swaps inverted", () => {
    expect(parseThresholds({ warnThreshold: "abc", critThreshold: "" })).toEqual({ warn: 60, crit: 85 });
    expect(parseThresholds({ warnThreshold: "90", critThreshold: "70" })).toEqual({ warn: 70, crit: 90 });
    expect(parseThresholds({ warnThreshold: "150", critThreshold: "80" })).toEqual({ warn: 60, crit: 80 });
  });
});

describe("effectiveWindow", () => {
  it("rolled-over window shows 0%", () => {
    const w = { utilization: 97, resetsAt: new Date(NOW - 1000).toISOString() };
    expect(effectiveWindow(w, NOW)).toEqual({ utilization: 0, resetsAt: null });
  });
});

describe("deriveView", () => {
  it("connected with data", () => {
    const v = deriveView(state(), prefs, NOW);
    expect(v.banners).toEqual([]);
    expect(v.title).toBeUndefined();
    expect(v.tooltip).toBe("Claude: 5h 8% · week 6%");
    expect(v.rows[0]).toMatchObject({ percent: "8%", reset: "resets in 2h 14m", level: "normal" });
    expect(v.rows[1].subtitle).toBe("6% · resets Sat 19:00");
    expect(v.updatedLabel).toBe("Updated 1 min ago from Claude Code");
    expect(v.summary).toBe("Session (5h): 8% · resets in 2h 14m\nWeekly: 6% · resets Sat 19:00");
  });

  it("percent text per mode", () => {
    const on = { ...prefs, showPercentText: true };
    expect(deriveView(state(), on, NOW).title).toBe("8%");
    expect(deriveView(state(), { ...on, ringMode: "weekly" }, NOW).title).toBe("6%");
    expect(deriveView(state(), { ...on, ringMode: "dual" }, NOW).title).toBe("8% · 6%");
  });

  it("dual mode renders two rings", () => {
    expect(decode(deriveView(state(), { ...prefs, ringMode: "dual" }, NOW).icon.dark)).toContain('r="15"');
  });

  it("not connected: hollow ring and setup banner", () => {
    const v = deriveView(state(null, false), prefs, NOW);
    expect(decode(v.icon.light)).toContain("<rect");
    expect(v.banners).toEqual([{ kind: "setup", text: NOT_CONNECTED }]);
    expect(v.updatedLabel).toBe("No data yet");
    expect(v.summary).toBe("");
  });

  it("connected without data: waiting banner", () => {
    expect(deriveView(state(null), prefs, NOW).banners).toEqual([{ kind: "setup", text: WAITING }]);
  });

  it("old data stays visible without dimming", () => {
    const v = deriveView(state(usage(8, 6, { fetchedAt: NOW - 3 * 60 * MIN })), prefs, NOW);
    expect(v.updatedLabel).toBe("Updated 3 h ago from Claude Code");
    expect(decode(v.icon.light)).not.toContain(' opacity="');
  });

  it("reached limit: full red ring and banner", () => {
    const v = deriveView(state(usage(100)), prefs, NOW);
    const svg = decode(v.icon.light);
    expect(svg).toContain(RED);
    expect(svg).not.toContain("dasharray");
    expect(v.banners).toEqual([{ kind: "limit", text: "Session limit reached, resets in 2h 14m" }]);
    expect(v.rows[0].level).toBe("critical");
  });

  it("thresholds colour the arc", () => {
    expect(decode(deriveView(state(usage(70)), prefs, NOW).icon.light)).toContain(AMBER);
    expect(decode(deriveView(state(usage(90)), prefs, NOW).icon.light)).toContain(RED);
    expect(deriveView(state(usage(70)), prefs, NOW).rows[0].level).toBe("warning");
  });

  it("missing window shows 0%", () => {
    const v = deriveView(state(usage(8, 6, { sevenDay: null })), prefs, NOW);
    expect(v.rows[1].subtitle).toBe("0%");
  });

  it("read error shows instead of waiting", () => {
    const v = deriveView(state(null), prefs, NOW, new Error("bad file"));
    expect(v.banners).toEqual([{ kind: "error", text: "bad file" }]);
    expect(decode(v.icon.light)).toContain("<rect");
  });

  it("read error keeps the last numbers visible", () => {
    const v = deriveView(state(), prefs, NOW, new Error("bad file"));
    expect(v.banners[0]).toEqual({ kind: "error", text: "bad file" });
    expect(v.rows[0].percent).toBe("8%");
  });
});
