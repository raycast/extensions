export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  cacheCreation5mTokens?: number;
  cacheCreation1hTokens?: number;
  model?: string;
}

export interface CacheCreationBreakdown {
  total: number;
  fiveMinute?: number;
  oneHour?: number;
}

export function reconcileCacheCreation(
  aggregate: number,
  explicit5m?: number,
  explicit1h?: number,
): CacheCreationBreakdown {
  if (explicit5m === undefined && explicit1h === undefined) {
    return { total: aggregate };
  }
  let fiveMinute = explicit5m || 0;
  let oneHour = explicit1h || 0;
  if (explicit5m === undefined) {
    fiveMinute = Math.max(aggregate - oneHour, 0);
  } else if (explicit1h === undefined) {
    oneHour = Math.max(aggregate - fiveMinute, 0);
  } else if (aggregate > fiveMinute + oneHour) {
    fiveMinute += aggregate - fiveMinute - oneHour;
  }
  return {
    total: Math.max(aggregate, fiveMinute + oneHour),
    fiveMinute,
    oneHour,
  };
}

interface Pricing {
  match: string;
  inputPerMTok: number;
  outputPerMTok: number;
  cacheReadPerMTok: number;
  cacheWritePerMTok: number;
  tier?: {
    thresholdTokens: number;
    inputPerMTok: number;
    outputPerMTok: number;
    cacheReadPerMTok: number;
    cacheWritePerMTok: number;
  };
}

// List prices and prompt-cache rates, matched from most-specific model ID to
// family fallbacks. Sources:
// https://platform.claude.com/docs/en/about-claude/models/overview
// https://platform.claude.com/docs/en/build-with-claude/prompt-caching
const MODEL_PRICING: Pricing[] = [
  {
    match: "mythos-5",
    inputPerMTok: 10,
    outputPerMTok: 50,
    cacheReadPerMTok: 1,
    cacheWritePerMTok: 12.5,
  },
  {
    match: "fable-5",
    inputPerMTok: 10,
    outputPerMTok: 50,
    cacheReadPerMTok: 1,
    cacheWritePerMTok: 12.5,
  },
  {
    match: "opus-5",
    inputPerMTok: 5,
    outputPerMTok: 25,
    cacheReadPerMTok: 0.5,
    cacheWritePerMTok: 6.25,
  },
  {
    match: "opus-4-8",
    inputPerMTok: 5,
    outputPerMTok: 25,
    cacheReadPerMTok: 0.5,
    cacheWritePerMTok: 6.25,
  },
  {
    match: "opus-4-7",
    inputPerMTok: 5,
    outputPerMTok: 25,
    cacheReadPerMTok: 0.5,
    cacheWritePerMTok: 6.25,
  },
  {
    match: "opus-4-5",
    inputPerMTok: 5,
    outputPerMTok: 25,
    cacheReadPerMTok: 0.5,
    cacheWritePerMTok: 6.25,
  },
  {
    match: "opus-4-6",
    inputPerMTok: 5,
    outputPerMTok: 25,
    cacheReadPerMTok: 0.5,
    cacheWritePerMTok: 6.25,
  },
  {
    match: "opus-4-1",
    inputPerMTok: 15,
    outputPerMTok: 75,
    cacheReadPerMTok: 1.5,
    cacheWritePerMTok: 18.75,
  },
  {
    match: "opus",
    inputPerMTok: 15,
    outputPerMTok: 75,
    cacheReadPerMTok: 1.5,
    cacheWritePerMTok: 18.75,
  },
  {
    match: "sonnet-5",
    inputPerMTok: 2,
    outputPerMTok: 10,
    cacheReadPerMTok: 0.2,
    cacheWritePerMTok: 2.5,
  },
  {
    match: "sonnet-4-6",
    inputPerMTok: 3,
    outputPerMTok: 15,
    cacheReadPerMTok: 0.3,
    cacheWritePerMTok: 3.75,
  },
  {
    match: "sonnet",
    inputPerMTok: 3,
    outputPerMTok: 15,
    cacheReadPerMTok: 0.3,
    cacheWritePerMTok: 3.75,
    tier: {
      thresholdTokens: 200_000,
      inputPerMTok: 6,
      outputPerMTok: 22.5,
      cacheReadPerMTok: 0.6,
      cacheWritePerMTok: 7.5,
    },
  },
  {
    match: "haiku-4",
    inputPerMTok: 1,
    outputPerMTok: 5,
    cacheReadPerMTok: 0.1,
    cacheWritePerMTok: 1.25,
  },
  {
    match: "haiku",
    inputPerMTok: 0.8,
    outputPerMTok: 4,
    cacheReadPerMTok: 0.08,
    cacheWritePerMTok: 1,
  },
];

const DEFAULT_PRICING = MODEL_PRICING.find(
  (pricing) => pricing.match === "sonnet",
)!;

function resolvePricing(model?: string): Pricing {
  if (!model) return DEFAULT_PRICING;
  const lower = model.toLowerCase();
  return (
    MODEL_PRICING.find((pricing) => lower.includes(pricing.match)) ||
    DEFAULT_PRICING
  );
}

export function calculateMessageCost(usage: TokenUsage): number {
  const pricing = resolvePricing(usage.model);
  const highTier =
    pricing.tier !== undefined &&
    usage.inputTokens > pricing.tier.thresholdTokens;
  const rates = highTier ? pricing.tier! : pricing;
  const hasDetailedCacheWrites =
    usage.cacheCreation5mTokens !== undefined ||
    usage.cacheCreation1hTokens !== undefined;
  const cacheCreation5mTokens = hasDetailedCacheWrites
    ? usage.cacheCreation5mTokens || 0
    : usage.cacheCreationTokens;
  const cacheCreation1hTokens = usage.cacheCreation1hTokens || 0;
  return (
    (usage.inputTokens / 1_000_000) * rates.inputPerMTok +
    (usage.outputTokens / 1_000_000) * rates.outputPerMTok +
    (usage.cacheReadTokens / 1_000_000) * rates.cacheReadPerMTok +
    (cacheCreation5mTokens / 1_000_000) * rates.cacheWritePerMTok +
    (cacheCreation1hTokens / 1_000_000) * rates.inputPerMTok * 2
  );
}

export function calculateUsageCost(usage: TokenUsage): number {
  return calculateMessageCost(usage);
}
