import { describe, expect, it } from "vitest";
import { CodexUsageResponse, parseCodexUsage } from "./parser";

/** Captured verbatim from GET https://chatgpt.com/backend-api/wham/usage. */
const LIVE_RESPONSE: CodexUsageResponse = {
  plan_type: "pro",
  rate_limit: {
    primary_window: {
      used_percent: 1,
      limit_window_seconds: 604800,
      reset_after_seconds: 530130,
      reset_at: 1785693079,
    },
    secondary_window: null,
  },
  additional_rate_limits: [
    {
      limit_name: "GPT-5.3-Codex-Spark",
      metered_feature: "codex_bengalfox",
      rate_limit: {
        primary_window: {
          used_percent: 0,
          limit_window_seconds: 604800,
          reset_after_seconds: 604800,
          reset_at: 1785764315,
        },
        secondary_window: null,
      },
    },
  ],
};

const NOW = new Date("2026-07-27T15:40:00.000Z");

describe("parseCodexUsage", () => {
  it("maps the live response, classifying the 604800s window as weekly", () => {
    const windows = parseCodexUsage(LIVE_RESPONSE, NOW);

    expect(windows).toHaveLength(2);
    expect(windows[0]).toMatchObject({
      id: "weekly",
      label: "Weekly",
      kind: "weekly",
      usedPercent: 1,
      isPrimary: true,
    });
    expect(windows[1]).toMatchObject({ id: "scoped:GPT-5.3-Codex-Spark", kind: "scoped", isPrimary: false });
  });

  it("reads reset_at as unix seconds", () => {
    const [weekly] = parseCodexUsage(LIVE_RESPONSE, NOW);
    expect(weekly.resetsAt?.getTime()).toBe(1785693079 * 1000);
  });

  it("classifies by window length, not by field position", () => {
    // Here the *primary* window is the short one — position would misclassify it.
    const windows = parseCodexUsage(
      {
        rate_limit: {
          primary_window: { used_percent: 40, limit_window_seconds: 18000, reset_at: 1785693079 },
          secondary_window: { used_percent: 60, limit_window_seconds: 604800, reset_at: 1785764315 },
        },
      },
      NOW,
    );

    expect(windows.find((w) => w.kind === "session")?.usedPercent).toBe(40);
    expect(windows.find((w) => w.kind === "weekly")?.usedPercent).toBe(60);
  });

  it("orders session before weekly", () => {
    const windows = parseCodexUsage(
      {
        rate_limit: {
          primary_window: { used_percent: 60, limit_window_seconds: 604800, reset_at: 1785764315 },
          secondary_window: { used_percent: 40, limit_window_seconds: 18000, reset_at: 1785693079 },
        },
      },
      NOW,
    );

    expect(windows.map((w) => w.kind)).toEqual(["session", "weekly"]);
  });

  it("handles a missing secondary window", () => {
    const windows = parseCodexUsage({ rate_limit: { primary_window: LIVE_RESPONSE.rate_limit!.primary_window } }, NOW);
    expect(windows).toHaveLength(1);
  });

  it("derives a reset time from reset_after_seconds when reset_at is absent", () => {
    const windows = parseCodexUsage(
      { rate_limit: { primary_window: { used_percent: 5, limit_window_seconds: 18000, reset_after_seconds: 600 } } },
      NOW,
    );
    expect(windows[0].resetsAt?.getTime()).toBe(NOW.getTime() + 600_000);
  });

  it("returns nothing for an empty or signed-out payload", () => {
    expect(parseCodexUsage({}, NOW)).toEqual([]);
    expect(parseCodexUsage({ rate_limit: null, additional_rate_limits: null }, NOW)).toEqual([]);
  });

  it("keeps a zero-percent window rather than treating it as missing", () => {
    const windows = parseCodexUsage(
      { rate_limit: { primary_window: { used_percent: 0, limit_window_seconds: 604800, reset_at: 1785693079 } } },
      NOW,
    );
    expect(windows).toHaveLength(1);
    expect(windows[0].usedPercent).toBe(0);
  });

  it("falls back to metered_feature when limit_name is missing", () => {
    const windows = parseCodexUsage(
      {
        additional_rate_limits: [
          {
            metered_feature: "codex_bengalfox",
            rate_limit: { primary_window: { used_percent: 7, limit_window_seconds: 604800 } },
          },
        ],
      },
      NOW,
    );
    expect(windows[0].label).toBe("codex_bengalfox");
  });
});
