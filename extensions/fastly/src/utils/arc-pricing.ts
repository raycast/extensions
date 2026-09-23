// Estimated AI spend, mirroring how Fastly AI Runtime Control computes per-request
// cost: substring match against a pricing table of USD per million tokens, first
// (most specific) pattern wins, unknown models cost $0. The admin API doesn't
// expose recorded spend, so this is a client-side estimate from token counts.

interface ModelPricing {
  pattern: string;
  inputPerMTokens: number;
  outputPerMTokens: number;
}

// Ordered by pattern length descending so more specific patterns match first.
const PRICING: ModelPricing[] = [
  { pattern: "claude-3-5-sonnet", inputPerMTokens: 3.0, outputPerMTokens: 15.0 },
  { pattern: "claude-3-5-haiku", inputPerMTokens: 0.8, outputPerMTokens: 4.0 },
  { pattern: "gemini-2.5-flash", inputPerMTokens: 0.15, outputPerMTokens: 0.6 },
  { pattern: "gemini-2.0-flash", inputPerMTokens: 0.1, outputPerMTokens: 0.4 },
  { pattern: "gemini-1.5-flash", inputPerMTokens: 0.075, outputPerMTokens: 0.3 },
  { pattern: "claude-3-sonnet", inputPerMTokens: 3.0, outputPerMTokens: 15.0 },
  { pattern: "claude-sonnet-4", inputPerMTokens: 3.0, outputPerMTokens: 15.0 },
  { pattern: "claude-3-haiku", inputPerMTokens: 0.25, outputPerMTokens: 1.25 },
  { pattern: "gemini-2.5-pro", inputPerMTokens: 1.25, outputPerMTokens: 10.0 },
  { pattern: "gemini-1.5-pro", inputPerMTokens: 1.25, outputPerMTokens: 5.0 },
  { pattern: "claude-3-opus", inputPerMTokens: 15.0, outputPerMTokens: 75.0 },
  { pattern: "claude-opus-4", inputPerMTokens: 15.0, outputPerMTokens: 75.0 },
  { pattern: "gpt-4.1-mini", inputPerMTokens: 0.4, outputPerMTokens: 1.6 },
  { pattern: "gpt-4.1-nano", inputPerMTokens: 0.1, outputPerMTokens: 0.4 },
  { pattern: "gpt-4-turbo", inputPerMTokens: 10.0, outputPerMTokens: 30.0 },
  { pattern: "gpt-4o-mini", inputPerMTokens: 0.15, outputPerMTokens: 0.6 },
  { pattern: "gpt-4.1", inputPerMTokens: 2.0, outputPerMTokens: 8.0 },
  { pattern: "gpt-3.5", inputPerMTokens: 0.5, outputPerMTokens: 1.5 },
  { pattern: "o3-mini", inputPerMTokens: 1.1, outputPerMTokens: 4.4 },
  { pattern: "o4-mini", inputPerMTokens: 1.1, outputPerMTokens: 4.4 },
  { pattern: "o1-mini", inputPerMTokens: 1.1, outputPerMTokens: 4.4 },
  { pattern: "gpt-4o", inputPerMTokens: 2.5, outputPerMTokens: 10.0 },
  { pattern: "gpt-4", inputPerMTokens: 30.0, outputPerMTokens: 60.0 },
  { pattern: "o3", inputPerMTokens: 10.0, outputPerMTokens: 40.0 },
  { pattern: "o1", inputPerMTokens: 15.0, outputPerMTokens: 60.0 },
];

export function estimateArcSpend(model: string, inputTokens: number, outputTokens: number): number {
  const needle = model.toLowerCase();
  const pricing = PRICING.find((entry) => needle.includes(entry.pattern));
  if (!pricing) {
    return 0;
  }
  return (inputTokens * pricing.inputPerMTokens) / 1e6 + (outputTokens * pricing.outputPerMTokens) / 1e6;
}

export function formatSpend(spend: number): string {
  return `$${spend.toFixed(2)}`;
}
