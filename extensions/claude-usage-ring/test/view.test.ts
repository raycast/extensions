import { describe, expect, it } from "vitest";
import { RED } from "../src/lib/ring";
import { parseUsage } from "../src/lib/usage-api";
import { deriveView, effectiveWindow, parseThresholds } from "../src/lib/view";
import { EMPTY_SNAPSHOT, type Prefs, type Snapshot } from "../src/types";
import { SAMPLE } from "./fixtures";

const prefs: Prefs = {
  ringMode: "session",
  showPercentText: false,
  warnThreshold: "60",
  critThreshold: "85",
  dataSource: "auto",
  credentialsSource: "keychain",
};
const NOW = new Date("2026-11-02T14:16:00Z").getTime();
const MIN = 60_000;
const decode = (uri: string) => Buffer.from(uri.split(",")[1], "base64").toString();
const snap = (over: Partial<Snapshot> = {}): Snapshot => ({
  ...EMPTY_SNAPSHOT,
  usage: parseUsage(SAMPLE, NOW - MIN),
  plan: { subscriptionType: "team", rateLimitTier: "default_claude_max_5x" },
  ...over,
});

describe("parseThresholds", () => {
  it("defaults on garbage, swaps inverted", () => {
    expect(parseThresholds({ warnThreshold: "abc", critThreshold: "" })).toEqual({ warn: 60, crit: 85 });
    expect(parseThresholds({ warnThreshold: "90", critThreshold: "70" })).toEqual({ warn: 70, crit: 90 });
    expect(parseThresholds({ warnThreshold: "150", critThreshold: "80" })).toEqual({ warn: 60, crit: 80 });
  });
});

describe("effectiveWindow", () => {
  it("rolled-over window shows 0%", () => {
    const w = { utilization: 97, resetsAt: new Date(NOW - 1000).toISOString(), lockedReason: "x" };
    expect(effectiveWindow(w, NOW)).toEqual({ utilization: 0, resetsAt: null, lockedReason: null });
  });
});

describe("deriveView", () => {
  it("fresh OK state", () => {
    const v = deriveView(snap(), prefs, NOW);
    expect(v.banners).toEqual([]);
    expect(v.dim).toBe(false);
    expect(v.title).toBeUndefined();
    expect(v.tooltip).toBe("Claude: 5h 8% · week 6%");
    expect(v.rows[0].subtitle).toBe("8% · resets in 2h 15m");
    expect(v.rows[1].subtitle).toMatch(/^6% · resets Sat 19:00$/);
    expect(v.extraRows).toEqual([]);
    expect(v.planLabel).toBe("Plan: Team · Max 5x");
    expect(v.updatedLabel).toBe("Updated 1 min ago");
    expect(v.rows[0]).toMatchObject({ percent: "8%", reset: "resets in 2h 15m", level: "normal" });
    expect(v.summary).toBe("Session (5h): 8% · resets in 2h 15m\nWeekly: 6% · resets Sat 19:00");
  });

  it("percent text per mode", () => {
    expect(deriveView(snap(), { ...prefs, showPercentText: true }, NOW).title).toBe("8%");
    expect(deriveView(snap(), { ...prefs, showPercentText: true, ringMode: "weekly" }, NOW).title).toBe("6%");
    expect(deriveView(snap(), { ...prefs, showPercentText: true, ringMode: "dual" }, NOW).title).toBe("8% · 6%");
  });

  it("dual mode renders two rings", () => {
    const v = deriveView(snap(), { ...prefs, ringMode: "dual" }, NOW);
    expect(decode(v.icon.dark)).toContain('r="15"');
  });

  it("stale data dims and shows a banner", () => {
    const v = deriveView(snap({ usage: parseUsage(SAMPLE, NOW - 23 * MIN) }), prefs, NOW);
    expect(v.dim).toBe(true);
    expect(v.banners).toContainEqual({ kind: "stale", text: "Data from 23 min ago" });
    expect(decode(v.icon.light)).toContain('opacity="0.5"');
  });

  it("error with cached data: last value, dimmed, banner", () => {
    const v = deriveView(snap({ lastError: { kind: "expired", at: NOW } }), prefs, NOW);
    expect(v.dim).toBe(true);
    expect(v.banners[0]).toEqual({ kind: "error", text: "Login expired. Open Claude Code once to refresh it." });
  });

  it("error with no data: hollow ring with !", () => {
    const v = deriveView({ ...EMPTY_SNAPSHOT, lastError: { kind: "not_found", at: NOW } }, prefs, NOW);
    expect(decode(v.icon.light)).toContain("<rect");
    expect(v.banners[0].text).toContain("Not logged in");
    expect(v.updatedLabel).toBe("Not updated yet");
  });

  it("rate limited shows retry time", () => {
    const until = new Date(2026, 10, 2, 14, 32).getTime();
    const v = deriveView(snap({ lastError: { kind: "rate_limited", at: NOW }, backoffUntil: until }), prefs, NOW);
    expect(v.banners[0]).toEqual({ kind: "paused", text: "Paused by Anthropic, retrying at 14:32" });
    expect(v.dim).toBe(false);
    expect(decode(v.icon.light)).not.toContain('opacity="0.5"');
  });

  it("locked window → full red + banner", () => {
    const s = snap({
      usage: parseUsage(
        { ...SAMPLE, five_hour: { ...SAMPLE.five_hour, utilization: 40, locked_reason: "five_hour_limit" } },
        NOW,
      ),
    });
    const v = deriveView(s, prefs, NOW);
    const svg = decode(v.icon.light);
    expect(svg).toContain(RED);
    expect(svg).not.toContain("dasharray");
    expect(
      v.banners.some((b) => b.kind === "locked" && b.text.includes("Session limit reached: five_hour_limit")),
    ).toBe(true);
    expect(v.rows[0].level).toBe("critical");
    expect(v.rows[0].subtitle.startsWith("100%")).toBe(true);
  });

  it("opus/sonnet rows only when non-null", () => {
    const s = snap({ usage: parseUsage({ ...SAMPLE, seven_day_opus: { utilization: 12 } }, NOW) });
    const v = deriveView(s, prefs, NOW);
    expect(v.extraRows.map((r) => r.title)).toEqual(["Opus Weekly"]);
    expect(v.extraRows[0].subtitle).toBe("12%");
  });

  it("amber/red thresholds colour the arc", () => {
    const s = (p: number) =>
      snap({ usage: parseUsage({ ...SAMPLE, five_hour: { ...SAMPLE.five_hour, utilization: p } }, NOW) });
    expect(decode(deriveView(s(70), prefs, NOW).icon.light)).toContain("#F5A524");
    expect(decode(deriveView(s(90), prefs, NOW).icon.light)).toContain("#F31260");
    expect(deriveView(s(70), prefs, NOW).rows[0].level).toBe("warning");
    expect(deriveView(s(90), prefs, NOW).rows[0].level).toBe("critical");
  });

  it("all-null usage shows 0% without crashing", () => {
    const v = deriveView(snap({ usage: parseUsage({ five_hour: null, seven_day: null }, NOW) }), prefs, NOW);
    expect(v.rows[0].subtitle).toBe("0%");
    expect(v.tooltip).toBe("Claude: 5h 0% · week 0%");
  });

  it("labels data from Claude Code", () => {
    const usage = { ...parseUsage(SAMPLE, NOW - 2 * MIN), origin: "claude-code" as const };
    expect(deriveView(snap({ usage }), prefs, NOW).updatedLabel).toBe("Updated 2 min ago via Claude Code");
  });

  it("not connected explains the next step", () => {
    const v = deriveView({ ...EMPTY_SNAPSHOT, lastError: { kind: "not_connected", at: NOW } }, prefs, NOW);
    expect(v.banners[0].text).toContain("Connect Claude Code");
  });
});
