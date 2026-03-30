interface ModelPricing {
  inputPerMTok: number;
  outputPerMTok: number;
  cacheReadPerMTok: number;
  cacheWritePerMTok: number;
}

// Pricing as of 2025 (USD per million tokens)
const PRICING: Record<string, ModelPricing> = {
  opus: {
    inputPerMTok: 15,
    outputPerMTok: 75,
    cacheReadPerMTok: 3.75,
    cacheWritePerMTok: 18.75,
  },
  sonnet: {
    inputPerMTok: 3,
    outputPerMTok: 15,
    cacheReadPerMTok: 0.3,
    cacheWritePerMTok: 3.75,
  },
  haiku: {
    inputPerMTok: 0.8,
    outputPerMTok: 4,
    cacheReadPerMTok: 0.08,
    cacheWritePerMTok: 1,
  },
};

const DEFAULT_PRICING = PRICING.sonnet;

export function resolveModelPricing(modelName: string): ModelPricing {
  const lower = modelName.toLowerCase();
  if (lower.includes("opus")) return PRICING.opus;
  if (lower.includes("haiku")) return PRICING.haiku;
  if (lower.includes("sonnet")) return PRICING.sonnet;
  return DEFAULT_PRICING;
}

export interface TokenUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export function calculateEntryCost(model: string, usage: TokenUsage): number {
  const p = resolveModelPricing(model);
  const input = ((usage.input_tokens || 0) / 1_000_000) * p.inputPerMTok;
  const output = ((usage.output_tokens || 0) / 1_000_000) * p.outputPerMTok;
  const cacheRead =
    ((usage.cache_read_input_tokens || 0) / 1_000_000) * p.cacheReadPerMTok;
  const cacheWrite =
    ((usage.cache_creation_input_tokens || 0) / 1_000_000) *
    p.cacheWritePerMTok;
  return input + output + cacheRead + cacheWrite;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return `${tokens}`;
}

/** Normalize model name for display (e.g. "claude-opus-4-6" → "Opus 4.6") */
export function normalizeModelName(model: string): string {
  const lower = model.toLowerCase();
  // Extract version like "4-6" → "4.6", "4-5" → "4.5"
  const versionMatch = lower.match(/(\d+)[-.](\d+)/);
  const version = versionMatch ? ` ${versionMatch[1]}.${versionMatch[2]}` : "";
  if (lower.includes("opus")) return `Opus${version}`;
  if (lower.includes("sonnet")) return `Sonnet${version}`;
  if (lower.includes("haiku")) return `Haiku${version}`;
  return model;
}
