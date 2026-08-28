import { describe, expect, it } from "@jest/globals";
import type { UsageLimitData } from "../types/usage-types";
import { getLimitRows } from "./limit-rows";

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

const scopedRows = (data: UsageLimitData) => getLimitRows(data).filter((row) => row.period !== null);

describe("getLimitRows", () => {
  it("returns the account totals first, then the per-model windows", () => {
    expect(getLimitRows(livePayload).map((row) => row.label)).toEqual(["5-Hour", "7-Day", "Fable"]);
  });

  it("keeps the fractional utilization the account totals report", () => {
    const [fiveHour, sevenDay] = getLimitRows(livePayload);

    expect(fiveHour.utilization).toBe(42.4);
    expect(fiveHour.decimals).toBe(1);
    expect(sevenDay.utilization).toBe(38.1);
  });

  it("takes the account totals from the flat fields, not their rounded limits[] counterparts", () => {
    const rounded = getLimitRows(livePayload).filter((row) => row.utilization === 42 || row.utilization === 38);

    expect(rounded).toEqual([]);
  });

  it("marks the account totals with their window length and no period", () => {
    const [fiveHour, sevenDay] = getLimitRows(livePayload);

    expect(fiveHour).toMatchObject({ period: null, windowHours: 5 });
    expect(sevenDay).toMatchObject({ period: null, windowHours: 7 * 24 });
  });

  it("reports a per-model window with the period the response gives it", () => {
    expect(scopedRows(livePayload)).toEqual([
      {
        key: "weekly:Fable",
        label: "Fable",
        period: "weekly",
        utilization: 15,
        decimals: 0,
        resets_at: WEEKLY_RESET,
        windowHours: null,
      },
    ]);
  });

  it("projects usage only across windows whose length is known", () => {
    expect(getLimitRows(livePayload).map((row) => row.windowHours)).toEqual([5, 7 * 24, null]);
  });

  it("excludes the session and weekly_all entries, which name no model", () => {
    expect(scopedRows(livePayload).map((row) => row.label)).toEqual(["Fable"]);
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

    expect(scopedRows(withCodenames).map((row) => row.label)).toEqual(["Fable"]);
  });

  it("ignores a scoped entry whose model carries no display name", () => {
    expect(
      scopedRows({
        ...baseData,
        limits: [{ kind: "weekly_scoped", group: "weekly", percent: 9, resets_at: WEEKLY_RESET, scope: {} }],
      }),
    ).toEqual([]);
  });

  it("keeps a model-scoped window whose period the API does not send today", () => {
    expect(
      scopedRows({
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
    ).toMatchObject([{ label: "Fable", period: "session", utilization: 7 }]);
  });

  it("reports the flat-field models when the payload has no limits array", () => {
    expect(
      scopedRows({
        ...baseData,
        seven_day_sonnet: { utilization: 45, resets_at: WEEKLY_RESET },
        seven_day_opus: { utilization: 82, resets_at: WEEKLY_RESET },
      }),
    ).toMatchObject([
      { label: "Sonnet", period: "weekly", utilization: 45, decimals: 1 },
      { label: "Opus", period: "weekly", utilization: 82, decimals: 1 },
    ]);
  });

  it("reports a flat-field model when the limits array names none", () => {
    expect(
      scopedRows({
        ...baseData,
        seven_day_opus: { utilization: 82, resets_at: WEEKLY_RESET },
        limits: [{ kind: "weekly_all", group: "weekly", percent: 38, resets_at: WEEKLY_RESET, scope: null }],
      }),
    ).toMatchObject([{ label: "Opus", utilization: 82 }]);
  });

  it("renders a model the limits array names once, not again from its flat field", () => {
    expect(
      scopedRows({
        ...baseData,
        seven_day_opus: { utilization: 82.4, resets_at: WEEKLY_RESET },
        limits: [
          {
            kind: "weekly_scoped",
            group: "weekly",
            percent: 80,
            resets_at: WEEKLY_RESET,
            scope: { model: { id: null, display_name: "Opus" } },
          },
        ],
      }),
    ).toMatchObject([{ label: "Opus", utilization: 80, decimals: 0 }]);
  });

  it("keeps the weekly flat-field row when the limits array scopes that model to another period", () => {
    expect(
      scopedRows({
        ...baseData,
        seven_day_opus: { utilization: 82.4, resets_at: WEEKLY_RESET },
        limits: [
          {
            kind: "session_scoped",
            group: "session",
            percent: 7,
            resets_at: SESSION_RESET,
            scope: { model: { id: null, display_name: "Opus" } },
          },
        ],
      }),
    ).toMatchObject([
      { label: "Opus", period: "session", utilization: 7 },
      { label: "Opus", period: "weekly", utilization: 82.4 },
    ]);
  });

  it("keeps a flat-field model the limits array does not name", () => {
    expect(
      scopedRows({
        ...livePayload,
        seven_day_sonnet: { utilization: 45, resets_at: WEEKLY_RESET },
        seven_day_opus: { utilization: 82, resets_at: WEEKLY_RESET },
      }).map((row) => row.label),
    ).toEqual(["Fable", "Sonnet", "Opus"]);
  });

  it("returns only the account totals for a payload with neither scoped shape", () => {
    expect(getLimitRows(baseData).map((row) => row.label)).toEqual(["5-Hour", "7-Day"]);
  });

  it("gives every row a distinct key", () => {
    const keys = getLimitRows(livePayload).map((row) => row.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("returns nothing for null", () => {
    expect(getLimitRows(null)).toEqual([]);
  });
});
