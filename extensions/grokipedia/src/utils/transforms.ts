import type { StatsResponseRaw, Stats } from "../types";

export function toNumber(val: string | number): number {
  if (typeof val === "number") return val;
  const n = Number(val || 0);
  return Number.isFinite(n) ? n : 0;
}

export function mapStats(raw: StatsResponseRaw): Stats {
  return {
    totalPages: toNumber(raw.totalPages),
    totalViews: toNumber(raw.totalViews),
    avgViewsPerPage: toNumber(raw.avgViewsPerPage),
    indexSizeBytes: toNumber(raw.indexSizeBytes),
    statsTimestamp: toNumber(raw.statsTimestamp),
    raw,
  };
}

export default { toNumber, mapStats };
