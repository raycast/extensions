import { describe, expect, it } from "vitest";
import { ClaudeUsageResponse, parseClaudeUsage } from "./parser";

/** Captured verbatim from GET https://api.anthropic.com/api/oauth/usage. */
const LIVE_RESPONSE: ClaudeUsageResponse = {
  five_hour: { utilization: 47.0, resets_at: "2026-07-27T16:39:59.717663+00:00" },
  seven_day: { utilization: 65.0, resets_at: "2026-07-30T04:59:59.717684+00:00" },
  limits: [
    {
      kind: "session",
      group: "session",
      percent: 47,
      resets_at: "2026-07-27T16:39:59.717663+00:00",
      scope: null,
      is_active: false,
    },
    {
      kind: "weekly_all",
      group: "weekly",
      percent: 65,
      resets_at: "2026-07-30T04:59:59.717684+00:00",
      scope: null,
      is_active: true,
    },
    {
      kind: "weekly_scoped",
      group: "weekly",
      percent: 12,
      resets_at: "2026-07-30T04:59:59.717913+00:00",
      scope: { model: { id: null, display_name: "Fable" }, surface: null },
      is_active: false,
    },
  ],
};

describe("parseClaudeUsage", () => {
  it("maps the live response into session, weekly and scoped windows", () => {
    const windows = parseClaudeUsage(LIVE_RESPONSE);

    expect(windows).toHaveLength(3);
    expect(windows[0]).toMatchObject({
      id: "session",
      label: "Session",
      kind: "session",
      usedPercent: 47,
      isPrimary: true,
    });
    expect(windows[1]).toMatchObject({
      id: "weekly",
      label: "Weekly",
      kind: "weekly",
      usedPercent: 65,
      isPrimary: true,
    });
    expect(windows[2]).toMatchObject({ id: "weekly:Fable", label: "Weekly · Fable", kind: "scoped", isPrimary: false });
  });

  it("parses reset timestamps as real dates", () => {
    const [session] = parseClaudeUsage(LIVE_RESPONSE);
    expect(session.resetsAt?.toISOString()).toBe("2026-07-27T16:39:59.717Z");
  });

  it("falls back to the flat windows when limits[] is absent", () => {
    const windows = parseClaudeUsage({ five_hour: LIVE_RESPONSE.five_hour, seven_day: LIVE_RESPONSE.seven_day });

    expect(windows.map((w) => w.id)).toEqual(["session", "weekly"]);
    expect(windows[1].usedPercent).toBe(65);
  });

  it("falls back when limits[] is present but empty", () => {
    const windows = parseClaudeUsage({ ...LIVE_RESPONSE, limits: [] });
    expect(windows.map((w) => w.id)).toEqual(["session", "weekly"]);
  });

  it("returns nothing when the payload carries no usable numbers", () => {
    expect(parseClaudeUsage({})).toEqual([]);
    expect(parseClaudeUsage({ limits: [{ kind: "session" }] })).toEqual([]);
  });

  it("keeps both scoped windows when two share a display name", () => {
    const windows = parseClaudeUsage({
      limits: [
        { kind: "weekly_scoped", percent: 10, scope: { model: { display_name: "Opus" } } },
        { kind: "weekly_scoped", percent: 20, scope: { model: { display_name: "Opus" } } },
      ],
    });

    expect(windows).toHaveLength(2);
    expect(new Set(windows.map((w) => w.id)).size).toBe(2);
  });

  it("clamps out-of-range percentages instead of trusting them", () => {
    const windows = parseClaudeUsage({ limits: [{ kind: "session", percent: 140 }] });
    expect(windows[0].usedPercent).toBe(100);
  });

  it("tolerates a null reset timestamp", () => {
    const windows = parseClaudeUsage({ limits: [{ kind: "session", percent: 5, resets_at: null }] });
    expect(windows[0].resetsAt).toBeNull();
  });

  it("surfaces unknown limit kinds rather than dropping them", () => {
    const windows = parseClaudeUsage({ limits: [{ kind: "monthly_all", group: "weekly", percent: 33 }] });
    expect(windows[0]).toMatchObject({ id: "monthly_all", label: "Monthly All", isPrimary: false });
  });
});
