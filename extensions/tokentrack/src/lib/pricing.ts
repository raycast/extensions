export type ModelPricing = {
  input: number;
  output: number;
  cachedInput?: number;
  /** 5-minute ephemeral cache write rate (Anthropic ≈ 1.25× input). */
  cacheWrite?: number;
  /**
   * 1-hour ephemeral cache write rate (Anthropic ≈ 2× input, i.e. 1.6× of the
   * 5m rate). Claude Code with extended thinking / long sessions writes most
   * cache at this tier; pricing it as 5m undercounts cache_creation by ~38%.
   * LiteLLM exposes this as `cache_creation_input_token_cost_above_1hr`.
   */
  cacheWrite1h?: number;
};

/** Last manual review of bundled fallback rates (LiteLLM covers most lookups). */
export const fallbackPricingUpdatedAt = "2026-05-13";

const fallbackPricing: Record<string, ModelPricing> = {
  "gpt-5.5": { input: 5, cachedInput: 0.5, output: 30 },
  "gpt-5.4": { input: 2.5, cachedInput: 0.25, output: 15 },
  "gpt-5.4-mini": { input: 0.75, cachedInput: 0.075, output: 4.5 },
  "gpt-5.2": { input: 1.75, cachedInput: 0.175, output: 14 },
  "gpt-5.4-pro": { input: 30, output: 180 },
  "gpt-5.2-pro": { input: 21, output: 168 },
  "claude-opus-4.7": {
    input: 5,
    cacheWrite: 6.25,
    cacheWrite1h: 10,
    cachedInput: 0.5,
    output: 25,
  },
  "claude-opus-4.6": {
    input: 5,
    cacheWrite: 6.25,
    cacheWrite1h: 10,
    cachedInput: 0.5,
    output: 25,
  },
  "claude-opus-4.5": {
    input: 5,
    cacheWrite: 6.25,
    cacheWrite1h: 10,
    cachedInput: 0.5,
    output: 25,
  },
  "claude-opus-4.1": {
    input: 15,
    cacheWrite: 18.75,
    cacheWrite1h: 30,
    cachedInput: 1.5,
    output: 75,
  },
  "claude-opus-4": {
    input: 15,
    cacheWrite: 18.75,
    cacheWrite1h: 30,
    cachedInput: 1.5,
    output: 75,
  },
  "claude-sonnet-4.6": {
    input: 3,
    cacheWrite: 3.75,
    cacheWrite1h: 6,
    cachedInput: 0.3,
    output: 15,
  },
  "claude-sonnet-4.5": {
    input: 3,
    cacheWrite: 3.75,
    cacheWrite1h: 6,
    cachedInput: 0.3,
    output: 15,
  },
  "claude-sonnet-4": {
    input: 3,
    cacheWrite: 3.75,
    cacheWrite1h: 6,
    cachedInput: 0.3,
    output: 15,
  },
  "claude-haiku-4.5": {
    input: 1,
    cacheWrite: 1.25,
    cacheWrite1h: 2,
    cachedInput: 0.1,
    output: 5,
  },
  /**
   * Cursor “Auto” / empty model bubbles do not map to a public API SKU. Surrogate
   * $/1M rates (USD) aligned with community Cursor Auto estimates — not invoice.
   * @see https://tokenuse.app/docs/development/tools/cursor/
   */
  "cursor-auto": {
    input: 1.25,
    cacheWrite: 1.25,
    cachedInput: 0.25,
    output: 6,
  },
};

let liveOverlay: Record<string, ModelPricing> | null = null;

let cachedMerged: Record<string, ModelPricing> = { ...fallbackPricing };
/** Longest key first — `normalized.includes(key)` (user id longer than table key). */
let mergedKeysSorted: string[] = [];
/** Shortest key first — catalog row extends user id with `-date` / `:ver` suffix. */
let mergedKeysSortedAsc: string[] = [];

function rebuildMergedPricing(): void {
  cachedMerged = { ...fallbackPricing, ...(liveOverlay ?? {}) };
  const k = Object.keys(cachedMerged);
  mergedKeysSorted = [...k].sort((a, b) => b.length - a.length);
  mergedKeysSortedAsc = [...k].sort((a, b) => a.length - b.length);
}

rebuildMergedPricing();

function setLivePricingOverlay(
  overlay: Record<string, ModelPricing> | null,
): void {
  liveOverlay = overlay && Object.keys(overlay).length > 0 ? overlay : null;
  rebuildMergedPricing();
}

export function normalizeModel(model: string): string {
  let m = model.trim().toLowerCase();
  const stripPrefixes = [
    "openrouter/",
    "azure_ai/",
    "azure/",
    "vercel_ai_gateway/",
    "github_copilot/",
    "perplexity/",
    "databricks/",
    "gmi/",
  ];
  for (const p of stripPrefixes) {
    if (m.startsWith(p)) m = m.slice(p.length);
  }
  m = m
    .replace(/^(us|eu|au|apac)\.anthropic\./, "anthropic.")
    .replace(/^global\.anthropic\./, "anthropic.");
  m = m.replace(/^openai\//, "").replace(/^anthropic\//, "");
  m = m.replace(/^anthropic\./, "").replace(/^openai\./, "");
  return m
    .replace(/_/g, "-")
    .replace(/thinking/g, "")
    .replace(/--+/g, "-")
    .replace(/-$/, "");
}

export function estimateCost(args: {
  model?: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  /**
   * Total cache-creation tokens (5m + 1h). `cacheWrite1hTokens` is the 1h
   * subset, the remainder is treated as 5m. Anthropic's API reports the split
   * under `usage.cache_creation.{ephemeral_1h,ephemeral_5m}_input_tokens`;
   * legacy lines without that breakdown bill entirely at the 5m rate.
   */
  cacheWriteTokens: number;
  cacheWrite1hTokens?: number;
}) {
  const modelPricing = findPricing(args.model);
  if (!modelPricing) return 0;

  const cacheWrite1hTokens = Math.max(
    0,
    Math.min(args.cacheWrite1hTokens ?? 0, args.cacheWriteTokens),
  );
  const cacheWrite5mTokens = args.cacheWriteTokens - cacheWrite1hTokens;
  // Fall back to 1.6× of the 5m rate (≈ Anthropic's 5m → 1h ratio) when the
  // catalog row doesn't carry an explicit 1h price.
  const rateCacheWrite5m = modelPricing.cacheWrite ?? modelPricing.input;
  const rateCacheWrite1h = modelPricing.cacheWrite1h ?? rateCacheWrite5m * 1.6;

  return (
    (args.inputTokens / 1_000_000) * modelPricing.input +
    (args.outputTokens / 1_000_000) * modelPricing.output +
    (args.cacheReadTokens / 1_000_000) *
      (modelPricing.cachedInput ?? modelPricing.input) +
    (cacheWrite5mTokens / 1_000_000) * rateCacheWrite5m +
    (cacheWrite1hTokens / 1_000_000) * rateCacheWrite1h
  );
}

function versionHyphenDotVariants(s: string): string[] {
  const dotMinor = s.replace(/-(\d)-(\d)(?=-|$)/g, "-$1.$2");
  const hypMinor = s.replace(/-(\d)\.(\d)(?=-|$)/g, "-$1-$2");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of [s, dotMinor, hypMinor]) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function catalogKeyExtendsUser(user: string, catalogKey: string): boolean {
  if (catalogKey === user) return true;
  return (
    catalogKey.startsWith(`${user}-`) ||
    catalogKey.startsWith(`${user}.`) ||
    catalogKey.startsWith(`${user}:`)
  );
}

function findPricing(model?: string) {
  if (!model) return undefined;
  const base = normalizeModel(model);
  for (const normalized of versionHyphenDotVariants(base)) {
    const hit = findPricingOneNormalized(normalized);
    if (hit) return hit;
  }
  return undefined;
}

function findPricingOneNormalized(
  normalized: string,
): ModelPricing | undefined {
  if (cachedMerged[normalized]) return cachedMerged[normalized];

  for (const key of mergedKeysSorted) {
    if (normalized.includes(key)) return cachedMerged[key];
  }

  for (const key of mergedKeysSortedAsc) {
    if (catalogKeyExtendsUser(normalized, key)) return cachedMerged[key];
  }
  return undefined;
}

let pricingRefreshInFlight: Promise<void> | null = null;

/**
 * Merges LiteLLM’s community-maintained per-token rates (24h disk cache) with
 * bundled fallback rows. OpenRouter was considered; LiteLLM matches direct
 * provider model IDs and exposes cache read/write costs more consistently.
 */
export function refreshLivePricingIfStale(): Promise<void> {
  if (pricingRefreshInFlight) return pricingRefreshInFlight;
  pricingRefreshInFlight = (async () => {
    try {
      const { fetchLivePricingIndex } = await import("./litellm-cost-map");
      const live = await fetchLivePricingIndex();
      if (live !== null) setLivePricingOverlay(live);
    } catch {
      // Keep overlay / fallback as-is.
    } finally {
      pricingRefreshInFlight = null;
    }
  })();
  return pricingRefreshInFlight;
}
