import { LocalStorage } from "@raycast/api";
import type { ModelPricing } from "./pricing";
import { normalizeModel } from "./pricing";

const LITELLM_MODEL_COST_MAP_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

const STORAGE_KEY = "tokentrack-litellm-pricing-v1";
const NETWORK_TIMEOUT_MS = 15_000;
/** Prefer fresh data from GitHub; stale disk/network fallback can be older. */
export const LIVE_PRICING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type LiteLLRow = {
  litellm_provider?: string;
  input_cost_per_token?: unknown;
  output_cost_per_token?: unknown;
  cache_read_input_token_cost?: unknown;
  cache_creation_input_token_cost?: unknown;
  /**
   * Anthropic's 1-hour ephemeral cache write rate (≈ 2× input, 1.6× of the
   * 5m rate). Present on `claude-opus-4-*` and `claude-sonnet-4-*` rows; we
   * surface it as `ModelPricing.cacheWrite1h` so heavy 1h-cache users (Claude
   * Code with extended thinking / long sessions) don't get their
   * cache_creation cost underestimated by ~38%.
   */
  cache_creation_input_token_cost_above_1hr?: unknown;
};

type StoredPayload = {
  savedAt: number;
  live: Record<string, ModelPricing>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function perMillionFromPerToken(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return undefined;
  return v * 1_000_000;
}

function rowToModelPricing(row: LiteLLRow): ModelPricing | null {
  const input = perMillionFromPerToken(row.input_cost_per_token);
  const output = perMillionFromPerToken(row.output_cost_per_token);
  if (input === undefined || output === undefined) return null;

  const pricing: ModelPricing = { input, output };
  const cachedInput = perMillionFromPerToken(row.cache_read_input_token_cost);
  if (cachedInput !== undefined) pricing.cachedInput = cachedInput;
  const cacheWrite = perMillionFromPerToken(
    row.cache_creation_input_token_cost,
  );
  if (cacheWrite !== undefined) pricing.cacheWrite = cacheWrite;
  const cacheWrite1h = perMillionFromPerToken(
    row.cache_creation_input_token_cost_above_1hr,
  );
  if (cacheWrite1h !== undefined) pricing.cacheWrite1h = cacheWrite1h;
  return pricing;
}

/** Higher score wins when two catalog rows normalize to the same key. */
function providerPreferenceScore(
  provider: string | undefined,
  normalizedKey: string,
): number {
  const p = (provider ?? "").toLowerCase();
  let s = 0;
  if (normalizedKey.includes("claude")) {
    if (p === "anthropic") s += 100;
    if (p.includes("vertex")) s += 45;
    if (p.includes("bedrock")) s += 40;
    if (p === "azure" || p === "azure_ai") s += 25;
  } else if (/^(gpt|o[0-9]|chatgpt)/.test(normalizedKey)) {
    if (p === "openai") s += 100;
    if (p === "azure" || p === "azure_ai") s += 35;
  } else {
    s += 30;
  }
  if (p.includes("openrouter")) s -= 5;
  return s;
}

function catalogKeyVariants(rawKey: string): string[] {
  const n = normalizeModel(rawKey);
  const out = new Set<string>([n]);
  if (n.startsWith("claude") || n.startsWith("gemini")) {
    const dashed = n.replace(/\./g, "-");
    if (dashed !== n) out.add(dashed);
  }
  return [...out];
}

/**
 * Builds a normalized-key → USD per 1M tokens map from LiteLLM's cost JSON.
 */
export function buildLivePricingIndex(
  root: Record<string, unknown>,
): Record<string, ModelPricing> {
  const best = new Map<
    string,
    { pricing: ModelPricing; score: number; key: string }
  >();

  for (const [rawKey, value] of Object.entries(root)) {
    if (!isRecord(value)) continue;
    const row = value as LiteLLRow;
    const pricing = rowToModelPricing(row);
    if (!pricing) continue;
    for (const nk of catalogKeyVariants(rawKey)) {
      const score = providerPreferenceScore(row.litellm_provider, nk);
      const prev = best.get(nk);
      if (
        !prev ||
        score > prev.score ||
        (score === prev.score && rawKey.length > prev.key.length)
      ) {
        best.set(nk, { pricing, score, key: rawKey });
      }
    }
  }

  return Object.fromEntries(
    [...best.entries()].map(([k, { pricing }]) => [k, pricing]),
  );
}

async function readDiskCache(): Promise<StoredPayload | null> {
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (typeof raw !== "string" || !raw) return null;
    const parsed = JSON.parse(raw) as StoredPayload;
    if (
      typeof parsed.savedAt !== "number" ||
      !isRecord(parsed.live) ||
      Object.keys(parsed.live).length === 0
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

/** After a failed download, wait before hitting the network again (dashboard refreshes often). */
const NETWORK_FAILURE_COOLDOWN_MS = 15 * 60 * 1000;

let networkBackoffUntil = 0;

async function writeDiskCache(
  live: Record<string, ModelPricing>,
): Promise<void> {
  try {
    const payload: StoredPayload = { savedAt: Date.now(), live };
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Raycast LocalStorage size limits — ignore if payload is too large.
  }
}

async function fetchRemoteCostMap(): Promise<Record<string, unknown>> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), NETWORK_TIMEOUT_MS);
  try {
    const res = await fetch(LITELLM_MODEL_COST_MAP_URL, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as unknown;
    if (!isRecord(json)) throw new Error("invalid JSON root");
    return json;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Returns LiteLLM-derived pricing keyed by {@link normalizeModel}, or `null` if
 * nothing could be loaded (caller should keep the previous overlay).
 */
export async function fetchLivePricingIndex(): Promise<Record<
  string,
  ModelPricing
> | null> {
  const disk = await readDiskCache();
  const diskAge = disk ? Date.now() - disk.savedAt : Number.POSITIVE_INFINITY;

  if (disk && diskAge < LIVE_PRICING_MAX_AGE_MS) {
    return disk.live;
  }

  if (Date.now() < networkBackoffUntil) {
    if (disk && Object.keys(disk.live).length > 0) return disk.live;
    return null;
  }

  try {
    const raw = await fetchRemoteCostMap();
    const live = buildLivePricingIndex(raw);
    if (Object.keys(live).length === 0) throw new Error("empty cost map");
    await writeDiskCache(live);
    networkBackoffUntil = 0;
    return live;
  } catch {
    networkBackoffUntil = Date.now() + NETWORK_FAILURE_COOLDOWN_MS;
    if (disk && Object.keys(disk.live).length > 0) {
      return disk.live;
    }
    return null;
  }
}
