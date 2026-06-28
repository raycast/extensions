/** Normalized token counts from OpenAI, Anthropic, or Gemini responses. */
export type TokenUsage = {
  input?: number;
  output?: number;
  total?: number;
};

export type ModelResponse = {
  text: string;
  usage?: TokenUsage;
};

/**
 * Approximate public list prices (USD per 1M input / output tokens).
 * Update when provider pricing changes; actual billing may differ (tiers, caching, etc.).
 */
const USD_PER_MILLION: Record<string, { input: number; output: number }> = {
  "openai:gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai:gpt-4o": { input: 2.5, output: 10 },
  "openai:gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "openai:gpt-4.1": { input: 2.0, output: 8.0 },
  "anthropic:claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "anthropic:claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "gemini:gemini-2.5-flash": { input: 0.075, output: 0.3 },
  "gemini:gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "gemini:gemini-2.0-flash": { input: 0.1, output: 0.4 },
};

export type FormatUsageHintOptions = {
  modelValue?: string;
  /** When true, append approximate USD (requires token counts). */
  showEstimatedCost?: boolean;
};

export function sumTokenUsages(usages: TokenUsage[]): TokenUsage | null {
  if (usages.length === 0) {
    return null;
  }
  let inSum = 0;
  let outSum = 0;
  let haveInOut = false;
  let totSum = 0;
  let haveTot = false;
  for (const u of usages) {
    if (u.input != null && u.output != null) {
      inSum += u.input;
      outSum += u.output;
      haveInOut = true;
    } else if (u.total != null) {
      totSum += u.total;
      haveTot = true;
    }
  }
  if (haveInOut) {
    return { input: inSum, output: outSum };
  }
  if (haveTot) {
    return { total: totSum };
  }
  return null;
}

/** Append a new API response; replace the last slot on regenerate. */
export function pushUsageLedger(
  prev: TokenUsage[],
  usage: TokenUsage | null | undefined,
  replaceLast: boolean,
): TokenUsage[] {
  if (!usage) {
    return prev;
  }
  if (replaceLast && prev.length > 0) {
    return [...prev.slice(0, -1), usage];
  }
  return [...prev, usage];
}

function formatUsdApprox(usd: number): string {
  if (usd < 0.000_05) {
    return "~$0";
  }
  if (usd < 0.01) {
    return `~$${usd.toFixed(4)}`;
  }
  return `~$${usd.toFixed(2)}`;
}

export function estimateUsdForUsage(modelValue: string, usage: TokenUsage): number | null {
  const rates = USD_PER_MILLION[modelValue];
  if (!rates) {
    return null;
  }
  if (usage.input != null && usage.output != null) {
    return (usage.input * rates.input + usage.output * rates.output) / 1_000_000;
  }
  if (usage.total != null) {
    const blended = (rates.input + rates.output) / 2;
    return (usage.total * blended) / 1_000_000;
  }
  return null;
}

function costSuffix(modelValue: string | undefined, usage: TokenUsage, showEstimatedCost: boolean | undefined): string {
  if (!showEstimatedCost || !modelValue) {
    return "";
  }
  const usd = estimateUsdForUsage(modelValue, usage);
  if (usd == null) {
    return "";
  }
  return ` · ${formatUsdApprox(usd)}`;
}

export function formatUsageHint(
  usage: TokenUsage | undefined,
  enabled: boolean,
  options?: FormatUsageHintOptions,
): string {
  if (!enabled || !usage) {
    return "";
  }
  const showCost = Boolean(options?.showEstimatedCost && options?.modelValue);
  const ins = usage.input;
  const outs = usage.output;
  const tot = usage.total;
  let base: string;
  if (ins !== undefined && outs !== undefined) {
    base = ` · ${ins} in / ${outs} out tok`;
  } else if (tot !== undefined) {
    base = ` · ${tot} tok (total)`;
  } else {
    return "";
  }
  return base + costSuffix(options?.modelValue, usage, showCost);
}

/** Plain description for Markdown export footers (no leading separator). */
export function describeUsageForExport(usage: TokenUsage): string {
  const ins = usage.input;
  const outs = usage.output;
  const tot = usage.total;
  if (ins !== undefined && outs !== undefined) {
    return `${ins} in / ${outs} out`;
  }
  if (tot !== undefined) {
    return `${tot} total`;
  }
  return "";
}
