import { createFailure, createSuccess, type ToolResult } from "./tool-result";
import { buildUrl } from "../utils/apiClient";
import { mapStats } from "../utils/transforms";
import type { Stats, StatsResponseRaw } from "../types";

/**
 * Fetches site statistics from Grokipedia.
 * Returns information about total pages, views, index size, and other metrics.
 */
const tool = async (): Promise<ToolResult<Stats>> => {
  const url = buildUrl("/stats");
  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      return createFailure(`Failed to fetch stats (${response.status}): ${response.statusText}. ${errorBody}`);
    }

    const raw = (await response.json()) as StatsResponseRaw;
    const stats = mapStats(raw);

    return createSuccess(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return createFailure(`Failed to fetch stats: ${message}`);
  }
};

export default tool;
