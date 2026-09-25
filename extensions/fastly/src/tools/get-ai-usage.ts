import { getArcUsageMetrics, isArcNotEntitledError } from "../api";

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

/**
 * Get AI Runtime Control usage metrics: requests, sessions, input/output
 * tokens, and AI Firewall violations, broken down by day, virtual key,
 * provider, and model. Requires the account to have AI Runtime Control.
 */
export default async function ({ from, to, provider, model }: Input) {
  const defaultFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const response = await getArcUsageMetrics({ from: from || defaultFrom, to, provider, model });
    return response.data || [];
  } catch (error) {
    if (isArcNotEntitledError(error)) {
      throw new Error(
        "This Fastly account does not have access to AI Runtime Control. Contact Fastly to enable the product.",
      );
    }
    throw error;
  }
}
