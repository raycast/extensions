import { describe, expect, it } from "@jest/globals";
import type { UsageLimitData } from "../types/usage-types";
import { getScopedLimits } from "./scoped-limits";

const SESSION_RESET = "2026-08-28T09:00:00Z";
const WEEKLY_RESET = "2026-08-31T06:00:00Z";

const baseData: UsageLimitData = {
  five_hour: { utilization: 42.4, resets_at: SESSION_RESET },
  seven_day: { utilization: 38.1, resets_at: WEEKLY_RESET },
};

const livePayload: UsageLimitData = {
  ...baseData,
  seven_day_sonnet: null,
  seven_day_opus: null,
  limits: [
    {
      kind: "session",
      group: "session",
      percent: 42,
      severity: "normal",
      resets_at: SESSION_RESET,
      scope: null,
      is_active: true,
    },
    {
      kind: "weekly_all",
      group: "weekly",
      percent: 38,
      severity: "normal",
      resets_at: WEEKLY_RESET,
      scope: null,
      is_active: false,
    },
    {
      kind: "weekly_scoped",
      group: "weekly",
      percent: 15,
      severity: "normal",
      resets_at: WEEKLY_RESET,
      scope: { model: { id: null, display_name: "Fable" }, surface: null },
      is_active: false,
    },
  ],
};

describe("getScopedLimits", () => {
  it("surfaces the model-scoped window with the period the response reports", () => {
    expect(getScopedLimits(livePayload)).toEqual([
      { label: "Fable", period: "weekly", utilization: 15, resets_at: WEEKLY_RESET },
    ]);
  });

  it("excludes the session and weekly_all totals, which name no model", () => {
    expect(getScopedLimits(livePayload).map((limit) => limit.label)).toEqual(["Fable"]);
  });

  it("excludes the unlabeled codenamed windows the response also carries", () => {
    const withCodenames: UsageLimitData = {
      ...livePayload,
      limits: [
        ...(livePayload.limits ?? []),
        { kind: "nimbus_quill", group: "weekly", percent: 0, resets_at: null, scope: null },
        { kind: "seven_day_omelette", group: "weekly", percent: 0, resets_at: null, scope: null },
      ],
    };

    expect(getScopedLimits(withCodenames).map((limit) => limit.label)).toEqual(["Fable"]);
  });

  it("ignores a scoped entry whose model carries no display name", () => {
    expect(
      getScopedLimits({
        ...baseData,
        limits: [{ kind: "weekly_scoped", group: "weekly", percent: 9, resets_at: WEEKLY_RESET, scope: {} }],
      }),
    ).toEqual([]);
  });

  it("keeps a model-scoped window whose period the API does not send today", () => {
    expect(
      getScopedLimits({
        ...baseData,
        limits: [
          {
            kind: "session_scoped",
            group: "session",
            percent: 7,
            resets_at: SESSION_RESET,
            scope: { model: { id: null, display_name: "Fable" } },
          },
        ],
      }),
    ).toEqual([{ label: "Fable", period: "session", utilization: 7, resets_at: SESSION_RESET }]);
  });

  it("falls back to the flat fields when the payload has no limits array", () => {
    expect(
      getScopedLimits({
        ...baseData,
        seven_day_sonnet: { utilization: 45, resets_at: WEEKLY_RESET },
        seven_day_opus: { utilization: 82, resets_at: WEEKLY_RESET },
      }),
    ).toEqual([
      { label: "Sonnet", period: "weekly", utilization: 45, resets_at: WEEKLY_RESET },
      { label: "Opus", period: "weekly", utilization: 82, resets_at: WEEKLY_RESET },
    ]);
  });

  it("falls back when the limits array holds no model-scoped entries", () => {
    expect(
      getScopedLimits({
        ...baseData,
        seven_day_opus: { utilization: 82, resets_at: WEEKLY_RESET },
        limits: [{ kind: "weekly_all", group: "weekly", percent: 38, resets_at: WEEKLY_RESET, scope: null }],
      }),
    ).toEqual([{ label: "Opus", period: "weekly", utilization: 82, resets_at: WEEKLY_RESET }]);
  });

  it("does not double render a model present in both the limits array and the flat fields", () => {
    expect(
      getScopedLimits({
        ...livePayload,
        seven_day_sonnet: { utilization: 45, resets_at: WEEKLY_RESET },
        seven_day_opus: { utilization: 82, resets_at: WEEKLY_RESET },
      }),
    ).toEqual([{ label: "Fable", period: "weekly", utilization: 15, resets_at: WEEKLY_RESET }]);
  });

  it("returns nothing for a payload with neither shape", () => {
    expect(getScopedLimits(baseData)).toEqual([]);
  });

  it("returns nothing for null", () => {
    expect(getScopedLimits(null)).toEqual([]);
  });
});
