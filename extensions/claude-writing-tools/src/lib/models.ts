/**
 * Model catalogue and pricing. Prices are USD per million tokens (Anthropic API list prices).
 * `fallbacks` marks models that accept the server-side `fallbacks: "default"` refusal retry.
 */
export type ModelId = "claude-opus-5-5" | "claude-sonnet-5-5" | "claude-haiku-5-5" | "claude-fable-5-1";

export interface ModelInfo {
  id: ModelId;
  name: string;
  short: string;
  note: string;
  fallbacks: boolean;
}

export const MODELS: Record<ModelId, ModelInfo> = {
  "claude-opus-5-5": {
    id: "claude-opus-5-5",
    name: "Claude Opus 5.5",
    short: "Opus 5.5",
    note: "Recommended · smart and balanced",
    fallbacks: true,
  },
  "claude-sonnet-5-5": {
    id: "claude-sonnet-5-5",
    name: "Claude Sonnet 5.5",
    short: "Sonnet 5.5",
    note: "Fast and affordable",
    fallbacks: true,
  },
  "claude-haiku-5-5": {
    id: "claude-haiku-5-5",
    name: "Claude Haiku 5.5",
    short: "Haiku 5.5",
    note: "Fastest · lowest cost",
    fallbacks: false,
  },
  "claude-fable-5-1": {
    id: "claude-fable-5-1",
    name: "Claude Fable 5.1",
    short: "Fable 5.1",
    note: "Most capable · expensive",
    fallbacks: true,
  },
};

export const MODEL_IDS = Object.keys(MODELS) as ModelId[];
export const DEFAULT_MODEL: ModelId = "claude-opus-5-5";

export function isModelId(value: unknown): value is ModelId {
  return typeof value === "string" && value in MODELS;
}

/** Display name for any model id the API may report, including fallback models. */
export function modelLabel(id: string | null | undefined): string {
  if (!id) return "—";
  if (isModelId(id)) return MODELS[id].short;
  return id
    .replace(/^claude-/, "")
    .replace(/-(\d+)-(\d+)$/, " $1.$2")
    .replace(/-(\d+)$/, " $1")
    .replace(/^\w/, (c) => c.toUpperCase());
}

interface Price {
  input: number;
  output: number;
  cacheRead: number;
}

/** Fallback models are included so a refusal retry on them is still priced. */
const PRICES: Record<string, Price> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2 },
};

/** Haiku 5.5 switches to a second rate card when the prompt exceeds 100K tokens. */
const HAIKU_LONG: Price = { input: 0.5, output: 2.5, cacheRead: 0.05 };
const WEB_SEARCH_USD = 10 / 1000;

export interface TokenCounts {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
}

function priceFor(model: string, promptTokens: number): Price {
  if (model.startsWith("claude-haiku-5-5") && promptTokens > 100_000) return HAIKU_LONG;
  const exact = PRICES[model];
  if (exact) return exact;
  // Snapshot ids such as "claude-opus-5-5-20261001" share the base model's price.
  const base = Object.keys(PRICES).find((id) => model.startsWith(id));
  return base ? PRICES[base] : PRICES["claude-opus-5-5"];
}

export function tokenCost(model: string, t: TokenCounts): number {
  const prompt = t.input + t.cacheRead + t.cacheWrite5m + t.cacheWrite1h;
  const p = priceFor(model, prompt);
  const usd =
    t.input * p.input +
    t.output * p.output +
    t.cacheRead * p.cacheRead +
    t.cacheWrite5m * p.input * 1.25 +
    t.cacheWrite1h * p.input * 2;
  return usd / 1_000_000;
}

export function webSearchCost(searches: number): number {
  return searches * WEB_SEARCH_USD;
}

export function formatUsd(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}
