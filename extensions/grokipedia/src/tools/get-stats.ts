import { buildUrl } from "../utils/apiClient";
import { mapStats } from "../utils/transforms";
import type { StatsResponseRaw } from "../types";

/**
 * Fetches site statistics from Grokipedia.
 * Returns information about total pages, views, index size, and other metrics.
 */
const tool = async () => {
  const url = buildUrl("/stats");
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  const raw = (await response.json()) as StatsResponseRaw;
  const stats = mapStats(raw);

  return {
    data: stats,
    success: true,
  };
};

export default tool;
