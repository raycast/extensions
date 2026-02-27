import type { TokenUsage, CostBreakdown, ModelTier } from "./types";
import { PRICING } from "./constants";

export function calculateCost(
  tokens: TokenUsage,
  tier: ModelTier,
): CostBreakdown {
  const pricing = PRICING[tier];
  const M = 1_000_000;

  const inputCost = (tokens.input_tokens / M) * pricing.input;
  const outputCost = (tokens.output_tokens / M) * pricing.output;
  const cacheCreationCost =
    (tokens.cache_creation_input_tokens / M) * pricing.cacheCreation;
  const cacheReadCost =
    (tokens.cache_read_input_tokens / M) * pricing.cacheRead;

  return {
    inputCost,
    outputCost,
    cacheCreationCost,
    cacheReadCost,
    totalCost: inputCost + outputCost + cacheCreationCost + cacheReadCost,
  };
}
