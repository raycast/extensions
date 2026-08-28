import type { UsageLimitData } from "../types/usage-types";

export type ScopedLimit = {
  label: string;
  period: string;
  utilization: number;
  resets_at: string | null;
};

/**
 * Derive the per-model limit rows from a usage limits payload.
 *
 * An entry is model-scoped when it names a model, whatever window it covers, so a scoped window
 * for a period the API does not send today needs no change here. `group` carries that period, so
 * callers label the row from the response rather than assuming one.
 *
 * Accounts still served the older flat shape fall back to `seven_day_sonnet` / `seven_day_opus`,
 * which cached payloads written before `limits` existed also rely on.
 */
export const getScopedLimits = (data: UsageLimitData | null | undefined): ScopedLimit[] => {
  if (!data) return [];

  const scoped = (data.limits ?? []).flatMap((entry): ScopedLimit[] => {
    const label = entry.scope?.model?.display_name;
    if (typeof label !== "string" || label.length === 0) return [];

    return [{ label, period: entry.group, utilization: entry.percent, resets_at: entry.resets_at }];
  });

  if (scoped.length > 0) return scoped;

  return [
    { label: "Sonnet", window: data.seven_day_sonnet },
    { label: "Opus", window: data.seven_day_opus },
  ].flatMap(({ label, window }) =>
    window ? [{ label, period: "weekly", utilization: window.utilization, resets_at: window.resets_at }] : [],
  );
};
