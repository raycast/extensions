import { getArcUsageMetrics, isArcNotEntitledError } from "../api";
import { ArcUsageMetric } from "../types";

type Input = {
  /** Start of the time range as an ISO 8601 timestamp. Defaults to 7 days ago. */
  from?: string;
  /** End of the time range as an ISO 8601 timestamp. Defaults to now. */
  to?: string;
  /** Filter by AI provider ID, e.g. "openai", "anthropic" */
  provider?: string;
  /** Filter by model ID */
  model?: string;
};

// Follow next_cursor so totals cover the whole range, with a page cap as a safety guard
const MAX_PAGES = 10;

/**
 * Get AI Runtime Control usage metrics: requests, sessions, input/output
 * tokens, and AI Firewall violations, broken down by day, virtual key,
 * provider, and model. Requires the account to have AI Runtime Control.
 */
export default async function ({ from, to, provider, model }: Input) {
  const defaultFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const data: ArcUsageMetric[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const response = await getArcUsageMetrics({ from: from || defaultFrom, to, provider, model, cursor });
      data.push(...(response.data || []));
      cursor = response.meta?.next_cursor ?? undefined;
      if (!cursor) break;
    }
    return data;
  } catch (error) {
    if (isArcNotEntitledError(error)) {
      throw new Error(
        "This Fastly account does not have access to AI Runtime Control. Contact Fastly to enable the product.",
      );
    }
    throw error;
  }
}
