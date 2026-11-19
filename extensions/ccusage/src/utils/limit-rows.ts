import type { UsageLimitData } from "../types/usage-types";

/**
 * One rate limit window, in the shape every surface renders.
 *
 * A non-null `period` means the row is scoped to a single model and carries the API's `group`
 * for that window. The account-wide totals leave it null, because their `label` already names
 * the window they cover.
 */
type LimitRow = {
  key: string;
  label: string;
  period: string | null;
  utilization: number;
  /** The account totals arrive as floats, `limits[].percent` as an integer already rounded. */
  decimals: number;
  resets_at: string | null;
  /** Window length, where it is known well enough to project usage across it. */
  windowHours: number | null;
};

const getScopedRows = (data: UsageLimitData): LimitRow[] => {
  const fromLimits = (data.limits ?? []).flatMap((entry): LimitRow[] => {
    const label = entry.scope?.model?.display_name;
    if (typeof label !== "string" || label.length === 0) return [];

    return [
      {
        key: `${entry.group}:${label}`,
        label,
        period: entry.group,
        utilization: entry.percent,
        decimals: 0,
        resets_at: entry.resets_at,
        windowHours: null,
      },
    ];
  });

  const seen = new Set(fromLimits.map((row) => row.key));

  const fromFlatFields = [
    { label: "Sonnet", window: data.seven_day_sonnet },
    { label: "Opus", window: data.seven_day_opus },
  ].flatMap(({ label, window }) => {
    const key = `weekly:${label}`;

    return window && !seen.has(key)
      ? [
          {
            key,
            label,
            period: "weekly",
            utilization: window.utilization,
            decimals: 1,
            resets_at: window.resets_at,
            windowHours: null,
          },
        ]
      : [];
  });

  return [...fromLimits, ...fromFlatFields];
};

/**
 * Derive every limit row to render, account totals first and per-model windows after.
 *
 * The totals read the flat `five_hour` / `seven_day` fields rather than their `limits[]`
 * counterparts. Both describe the same windows, but the flat fields carry a fractional
 * utilization where `limits[].percent` is already rounded to an integer.
 *
 * Per-model windows come from `limits[]`, plus the flat `seven_day_sonnet` / `seven_day_opus`
 * fields for any weekly window `limits[]` does not already carry. An account served both shapes
 * at once keeps every window it reports and renders none of them twice. A total the plan does
 * not have, such as the 5-hour window on plans without one, yields no row.
 */
export const getLimitRows = (data: UsageLimitData | null | undefined): LimitRow[] => {
  if (!data) return [];

  const totals = [
    { key: "five_hour", label: "5-Hour", window: data.five_hour, windowHours: 5 },
    { key: "seven_day", label: "7-Day", window: data.seven_day, windowHours: 7 * 24 },
  ].flatMap(({ key, label, window, windowHours }): LimitRow[] =>
    window
      ? [
          {
            key,
            label,
            period: null,
            utilization: window.utilization,
            decimals: 1,
            resets_at: window.resets_at,
            windowHours,
          },
        ]
      : [],
  );

  return [...totals, ...getScopedRows(data)];
};
