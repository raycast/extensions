import { describe, expect, it } from "vitest";
import { ClaudeError, parseMetric, parseUsage, pickOrgId } from "../claude";

describe("parseMetric", () => {
  it("parses a well-formed window", () => {
    expect(parseMetric({ utilization: 33, resets_at: "2026-01-01T00:00:00Z" })).toEqual({
      percent: 33,
      resetsAt: "2026-01-01T00:00:00Z",
    });
  });

  it("accepts a numeric string utilization and null reset", () => {
    expect(parseMetric({ utilization: "12.5", resets_at: null })).toEqual({ percent: 12.5, resetsAt: null });
  });

  it("clamps utilization into 0…100", () => {
    expect(parseMetric({ utilization: 150 })?.percent).toBe(100);
    expect(parseMetric({ utilization: -5 })?.percent).toBe(0);
  });

  it("returns null for null / non-object / missing or NaN utilization", () => {
    expect(parseMetric(null)).toBeNull();
    expect(parseMetric("nope")).toBeNull();
    expect(parseMetric({})).toBeNull();
    expect(parseMetric({ utilization: "abc" })).toBeNull();
  });
});

describe("parseUsage (limits[] — current API)", () => {
  it("reads session, weekly-all, and scoped per-model limits (e.g. Fable)", () => {
    const json = {
      five_hour: null,
      seven_day: null,
      seven_day_opus: null,
      seven_day_sonnet: null,
      limits: [
        { kind: "session", group: "session", percent: 11, resets_at: "2026-07-10T15:10:00Z", is_active: true },
        { kind: "weekly_all", group: "weekly", percent: 8, resets_at: "2026-07-12T15:00:00Z", is_active: false },
        {
          kind: "weekly_scoped",
          group: "weekly",
          percent: 8,
          resets_at: "2026-07-12T15:00:00Z",
          scope: { model: { id: null, display_name: "Fable" }, surface: null },
        },
      ],
    };
    expect(parseUsage(json)).toEqual({
      session: { percent: 11, resetsAt: "2026-07-10T15:10:00Z" },
      weeklyAll: { percent: 8, resetsAt: "2026-07-12T15:00:00Z" },
      models: [{ label: "Fable", metric: { percent: 8, resetsAt: "2026-07-12T15:00:00Z" } }],
    });
  });

  it("labels a scoped limit with no display_name as 'Model'", () => {
    const json = { limits: [{ kind: "weekly_scoped", percent: 4, resets_at: null, scope: {} }] };
    expect(parseUsage(json).models).toEqual([{ label: "Model", metric: { percent: 4, resetsAt: null } }]);
  });
});

describe("parseUsage (legacy top-level fields — fallback)", () => {
  it("maps session, weekly-all, and every present per-model window", () => {
    const json = {
      five_hour: { utilization: 33, resets_at: "2026-01-01T05:00:00Z" },
      seven_day: { utilization: 13, resets_at: "2026-01-07T00:00:00Z" },
      seven_day_opus: { utilization: 5, resets_at: "2026-01-06T00:00:00Z" },
      seven_day_sonnet: { utilization: 1, resets_at: "2026-01-05T00:00:00Z" },
      seven_day_fable: { utilization: 2, resets_at: "2026-01-04T00:00:00Z" },
      extra_usage: { is_enabled: false },
    };
    expect(parseUsage(json)).toEqual({
      session: { percent: 33, resetsAt: "2026-01-01T05:00:00Z" },
      weeklyAll: { percent: 13, resetsAt: "2026-01-07T00:00:00Z" },
      // Ordered opus → sonnet → fable per MODEL_ORDER.
      models: [
        { label: "Opus", metric: { percent: 5, resetsAt: "2026-01-06T00:00:00Z" } },
        { label: "Sonnet", metric: { percent: 1, resetsAt: "2026-01-05T00:00:00Z" } },
        { label: "Fable", metric: { percent: 2, resetsAt: "2026-01-04T00:00:00Z" } },
      ],
    });
  });

  it("drops null per-model windows and labels unknown models", () => {
    const json = {
      seven_day_opus: null,
      seven_day_zephyr: { utilization: 7, resets_at: null },
    };
    expect(parseUsage(json).models).toEqual([{ label: "Zephyr", metric: { percent: 7, resetsAt: null } }]);
  });

  it("yields empty/null for an unexpected shape rather than throwing", () => {
    const empty = { session: null, weeklyAll: null, models: [] };
    expect(parseUsage("<html>blocked</html>")).toEqual(empty);
    expect(parseUsage(null)).toEqual(empty);
    expect(parseUsage({})).toEqual(empty);
  });
});

describe("pickOrgId", () => {
  it("returns the first org's uuid", () => {
    expect(pickOrgId([{ uuid: "org-1" }, { uuid: "org-2" }])).toBe("org-1");
  });

  it("throws ClaudeError on empty, non-array, or uuid-less input", () => {
    expect(() => pickOrgId([])).toThrow(ClaudeError);
    expect(() => pickOrgId(null)).toThrow(ClaudeError);
    expect(() => pickOrgId([{ name: "no-uuid" }])).toThrow(ClaudeError);
  });
});
