import type { MiniMaxModelRemain } from "./types";

export function getCodingModelRemain(remains: MiniMaxModelRemain[]): MiniMaxModelRemain | null {
  const active = remains.find((r) => r.current_interval_status === 1 || r.current_weekly_status === 1);
  return active || remains.find((r) => r.model_name.startsWith("MiniMax-M")) || remains[0] || null;
}

export function getIntervalPercent(model: MiniMaxModelRemain): number | null {
  if (model.current_interval_total_count > 0) {
    return getRemainingPercentFromCounts(model.current_interval_usage_count, model.current_interval_total_count);
  }
  if (model.current_interval_status === 1 && typeof model.current_interval_remaining_percent === "number") {
    return model.current_interval_remaining_percent;
  }
  return null;
}

export function getWeeklyPercent(model: MiniMaxModelRemain): number | null {
  if (model.current_weekly_total_count > 0) {
    return getRemainingPercentFromCounts(model.current_weekly_usage_count, model.current_weekly_total_count);
  }
  if (model.current_weekly_status === 1 && typeof model.current_weekly_remaining_percent === "number") {
    return model.current_weekly_remaining_percent;
  }
  return null;
}

function getRemainingPercentFromCounts(usage: number, total: number): number {
  if (total === 0) return 100;
  return Math.round(((total - usage) / total) * 100);
}
