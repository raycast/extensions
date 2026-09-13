import { Cache } from "@raycast/api";
import { useEffect, useState } from "react";

export interface ModelPricing {
  /** Display name from models.dev, e.g. "GPT-4o" */
  name: string;
  /** USD per 1M input tokens */
  inputCostPerMTok: number;
  /** Context window size in tokens */
  contextWindow: number;
}

export interface PricingData {
  /** Representative model for the o200k_base encoding (GPT-4o) */
  o200k: ModelPricing;
  /** Latest Claude Sonnet model */
  claude: ModelPricing;
  fetchedAt: number;
}

/** Used for context-window percentages when live pricing is unavailable */
export const FALLBACK_CONTEXT_WINDOWS = {
  o200k: 128000,
  claude: 200000,
};

const CACHE_KEY = "models-dev-pricing";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const API_URL = "https://models.dev/api.json";

const cache = new Cache();

function readCachedPricing(): PricingData | null {
  try {
    const raw = cache.get(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PricingData;
    if (!data?.o200k?.inputCostPerMTok || !data?.claude?.inputCostPerMTok) return null;
    return data;
  } catch {
    return null;
  }
}

interface ModelsDevModel {
  name?: string;
  cost?: { input?: number };
  limit?: { context?: number };
  release_date?: string;
}

function extractPricing(api: Record<string, { models?: Record<string, ModelsDevModel> }>): PricingData | null {
  const gpt4o = api?.openai?.models?.["gpt-4o"];

  const sonnets = Object.entries(api?.anthropic?.models ?? {})
    .filter(([id]) => /^claude-sonnet/.test(id))
    .map(([, model]) => model)
    .filter((m) => m?.cost?.input && m?.limit?.context && m?.release_date)
    .sort((a, b) => (b.release_date! < a.release_date! ? -1 : 1));
  const claude = sonnets[sonnets.length - 1];

  if (!gpt4o?.cost?.input || !gpt4o?.limit?.context || !claude) return null;

  return {
    o200k: {
      name: gpt4o.name ?? "GPT-4o",
      inputCostPerMTok: gpt4o.cost.input,
      contextWindow: gpt4o.limit.context,
    },
    claude: {
      name: claude.name ?? "Claude Sonnet",
      inputCostPerMTok: claude.cost!.input!,
      contextWindow: claude.limit!.context!,
    },
    fetchedAt: Date.now(),
  };
}

/**
 * Model pricing from models.dev, cached for 24h.
 * Returns null while loading, if disabled, or if the fetch fails (callers should degrade gracefully).
 */
export function useModelPricing(enabled: boolean): PricingData | null {
  const [pricing, setPricing] = useState<PricingData | null>(enabled ? readCachedPricing() : null);

  useEffect(() => {
    if (!enabled) return;
    const cached = readCachedPricing();
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setPricing(cached);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = extractPricing((await response.json()) as Parameters<typeof extractPricing>[0]);
        if (!data) throw new Error("Unexpected models.dev response shape");
        cache.set(CACHE_KEY, JSON.stringify(data));
        if (!cancelled) setPricing(data);
      } catch (e) {
        console.error("Failed to fetch model pricing:", e);
        // Keep stale cache if present; otherwise callers degrade to context-only display
        if (!cancelled && cached) setPricing(cached);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return pricing;
}

export function formatCost(tokens: number, inputCostPerMTok: number): string {
  const cost = (tokens / 1_000_000) * inputCostPerMTok;
  if (cost === 0) return "$0";
  if (cost < 0.0001) return "<$0.0001";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export function formatContextUsage(tokens: number, contextWindow: number): string {
  const compact = contextWindow >= 1_000_000 ? `${contextWindow / 1_000_000}M` : `${Math.round(contextWindow / 1000)}k`;
  const pct = (tokens / contextWindow) * 100;
  if (pct === 0) return `0% of ${compact}`;
  if (pct > 100) return `over ${compact} context`;
  if (pct < 0.1) return `<0.1% of ${compact}`;
  return `${pct < 1 ? pct.toFixed(1) : Math.round(pct)}% of ${compact}`;
}
