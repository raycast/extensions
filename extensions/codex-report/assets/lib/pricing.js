import { emptyTokens, addTokens, tokenVolume, LONG_CONTEXT_TOKEN_KEYS } from "./session.js";
import { fmtCompact } from "./format.js";

// Standard OpenAI API text-token list prices in USD per 1M tokens.
// Sources: developers.openai.com model pages and openai.com/api/pricing, checked 2026-08-15.
const MODEL_PRICES_USD_PER_1M = new Map([
  // Terra and Cyber: OpenAI pricing table, checked 2026-10-27.
  ["gpt-6.1-terra", { input: 1, cachedInput: 0.05, cacheWrite: 1.25, output: 5 }],
  ["gpt-5.6-cyber", { input: 12.5, cachedInput: 1.25, cacheWrite: 15.625, output: 75 }],
  // GPT-6.1 Sol: official model page, checked 2026-09-30.
  ["gpt-6.1-sol", { input: 2, cachedInput: 0.1, cacheWrite: 2.5, output: 10 }],
  // GPT-6 and GPT-5.6 Sol: official model pages, checked 2026-09-24.
  ["gpt-6-astra", { input: 10, cachedInput: 1, cacheWrite: 12.5, output: 50 }],
  ["gpt-6-sol", { input: 2, cachedInput: 0.2, cacheWrite: 2.5, output: 10 }],
  ["gpt-6-luna", { input: 0.1, cachedInput: 0.01, cacheWrite: 0.125, output: 0.5 }],
  ["gpt-5.6", { input: 4, cachedInput: 0.4, cacheWrite: 5, output: 20 }],
  ["gpt-5.6-sol", { input: 4, cachedInput: 0.4, cacheWrite: 5, output: 20 }],
  ["gpt-5.6-terra", { input: 2, cachedInput: 0.2, cacheWrite: 2.5, output: 12 }],
  ["gpt-5.6-luna", { input: 0.2, cachedInput: 0.02, cacheWrite: 0.25, output: 1.2 }],
  ["gpt-5.5", { input: 5, cachedInput: 0.5, output: 30 }],
  ["gpt-5.4", { input: 2.5, cachedInput: 0.25, output: 15 }],
  ["gpt-5.4-mini", { input: 0.75, cachedInput: 0.075, output: 4.5 }],
  ["gpt-5.4-nano", { input: 0.2, cachedInput: 0.02, output: 1.25 }],
  ["gpt-5.3-codex", { input: 1.75, cachedInput: 0.175, output: 14 }],
  ["gpt-5.2-codex", { input: 1.75, cachedInput: 0.175, output: 14 }],
  ["gpt-5.2", { input: 1.75, cachedInput: 0.175, output: 14 }],
  ["gpt-5.2-chat-latest", { input: 1.75, cachedInput: 0.175, output: 14 }],
  ["gpt-5.1-codex-max", { input: 1.25, cachedInput: 0.125, output: 10 }],
  ["gpt-5.1-codex", { input: 1.25, cachedInput: 0.125, output: 10 }],
  ["gpt-5.1", { input: 1.25, cachedInput: 0.125, output: 10 }],
  ["gpt-5-codex", { input: 1.25, cachedInput: 0.125, output: 10 }],
  ["gpt-5", { input: 1.25, cachedInput: 0.125, output: 10 }],
  ["gpt-5.1-codex-mini", { input: 0.25, cachedInput: 0.025, output: 2 }],
  ["gpt-5-mini", { input: 0.25, cachedInput: 0.025, output: 2 }],
  ["codex-mini-latest", { input: 1.5, cachedInput: 0.375, output: 6 }],
]);
// Standard Anthropic API prices, checked 2026-10-05 (Sonnet 5.5 cache reads 2026-10-27):
// https://platform.claude.com/docs/en/about-claude/pricing
const CLAUDE_PRICES = [
  ["claude-fable-5-1", 10, 50, 0.25], ["claude-mythos-5-1", 10, 50, 0.25],
  ["claude-opus-5-5", 4, 20, 0.2], ["claude-sonnet-5-5", 2, 10, 0.1],
  ["claude-fable-5", 10, 50, 1], ["claude-mythos-5", 10, 50, 1],
  ["claude-opus-5", 5, 25, 0.5], ["claude-sonnet-5", 2, 10, 0.2],
  ["claude-opus-4-8", 5, 25, 0.5], ["claude-opus-4-7", 5, 25, 0.5],
  ["claude-opus-4-6", 5, 25, 0.5], ["claude-opus-4-5", 5, 25, 0.5],
  ["claude-opus-4-1", 15, 75, 1.5], ["claude-opus-4", 15, 75, 1.5],
  ["claude-sonnet-4-6", 3, 15, 0.3], ["claude-sonnet-4-5", 3, 15, 0.3],
  ["claude-sonnet-4", 3, 15, 0.3], ["claude-haiku-4-5", 1, 5, 0.1],
  ["claude-3-5-haiku", 0.8, 4, 0.08],
];
for (const [model, input, output, cachedInput] of CLAUDE_PRICES) {
  MODEL_PRICES_USD_PER_1M.set(model, { input, output, cachedInput, cacheWrite: input * 1.25, cacheWrite1h: input * 2 });
}
// Haiku 5.5: prompt length includes cache reads/writes; rates checked 2026-10-27.
MODEL_PRICES_USD_PER_1M.set("claude-haiku-5-5", {
  input: 0.1, cachedInput: 0.01, cacheWrite: 0.125, cacheWrite1h: 0.2, output: 0.5,
  longContext: { input: 0.5, cachedInput: 0.05, cacheWrite: 0.625, cacheWrite1h: 1, output: 2.5 },
});
// Reserve is a fallback mode; estimate its API-equivalent cost using Luna.
const ESTIMATED_MODEL_ALIASES = new Map([["gpt-reserve", "gpt-5.6-luna"]]);
export function normalizeModelName(model) {
  const normalized = String(model ?? "").trim().toLowerCase().replace(/\[1m\]$/, "");
  if (MODEL_PRICES_USD_PER_1M.has(normalized)) {
    return normalized;
  }

  const withoutSnapshot = normalized.replace(/(?:-\d{4}-\d{2}-\d{2}|[-@]\d{8})$/, "");
  return MODEL_PRICES_USD_PER_1M.has(withoutSnapshot) ? withoutSnapshot : normalized;
}

export function modelPrice(model) {
  const normalized = normalizeModelName(model);
  return MODEL_PRICES_USD_PER_1M.get(ESTIMATED_MODEL_ALIASES.get(normalized) ?? normalized);
}

function flatCostForTokens(tokens, price) {
  const input = tokens.input_tokens ?? 0;
  const cachedInput = Math.min(tokens.cached_input_tokens ?? 0, input);
  const writes = Math.min((tokens.cache_creation_input_tokens ?? 0) + (tokens.cache_write_input_tokens ?? 0), Math.max(0, input - cachedInput));
  const oneHour = Math.min(tokens.cache_creation_1h_input_tokens ?? 0, writes);
  const uncachedInput = Math.max(input - cachedInput - writes, 0);
  return (
    uncachedInput * price.input
    + cachedInput * price.cachedInput
    + (writes - oneHour) * (price.cacheWrite ?? price.input)
    + oneHour * (price.cacheWrite1h ?? price.input)
    + (tokens.output_tokens ?? 0) * price.output
  ) / 1_000_000;
}

export function estimateCostForTokens(tokens, price) {
  if (!price.longContext) return flatCostForTokens(tokens, price);
  const short = { ...tokens };
  const long = {};
  for (const key of LONG_CONTEXT_TOKEN_KEYS) {
    long[key] = Math.min(tokens[`long_context_${key}`] ?? 0, tokens[key] ?? 0);
    short[key] = (tokens[key] ?? 0) - long[key];
  }
  return flatCostForTokens(short, price) + flatCostForTokens(long, price.longContext);
}

export function estimateCosts(modelTokens) {
  const pricedTokens = emptyTokens();
  const unpricedTokens = emptyTokens();
  const modelCosts = [];
  const unpricedModels = [];
  let totalCost = 0;

  for (const [model, tokens] of modelTokens) {
    if (tokenVolume(tokens) === 0) {
      continue;
    }

    const price = modelPrice(model);
    if (!price) {
      addTokens(unpricedTokens, tokens);
      unpricedModels.push({ model, tokens });
      continue;
    }

    const cost = estimateCostForTokens(tokens, price);
    addTokens(pricedTokens, tokens);
    totalCost += cost;
    modelCosts.push({
      model,
      canonicalModel: normalizeModelName(model),
      tokens,
      cost,
      price,
    });
  }

  modelCosts.sort((a, b) => b.cost - a.cost || a.model.localeCompare(b.model));
  unpricedModels.sort((a, b) => tokenVolume(b.tokens) - tokenVolume(a.tokens) || a.model.localeCompare(b.model));

  return {
    totalCost,
    pricedTokens,
    unpricedTokens,
    modelCosts,
    unpricedModels,
  };
}

export function costSummary(modelTokens) {
  const estimate = estimateCosts(modelTokens);
  return {
    totalCost: estimate.totalCost,
    pricedTokens: tokenVolume(estimate.pricedTokens),
    unpricedTokens: tokenVolume(estimate.unpricedTokens),
  };
}

export function costEstimateNotes(estimate) {
  const notes = estimate.modelCosts
    .filter((entry) => ESTIMATED_MODEL_ALIASES.has(entry.canonicalModel))
    .map((entry) => `estimated: ${entry.model} ≈ ${ESTIMATED_MODEL_ALIASES.get(entry.canonicalModel)}`);
  if (estimate.pricedTokens.cache_creation_unknown_input_tokens > 0) notes.push("estimated: cache writes with unknown duration use the 5-minute rate");
  if (estimate.pricedTokens.cache_write_input_tokens > 0) {
    notes.push(`cache writes: ${fmtCompact(estimate.pricedTokens.cache_write_input_tokens)} tokens included in input`);
    notes.push("estimated: OpenAI cache writes assume 30-minute retention; Codex logs do not distinguish 12-hour writes");
  }
  return notes;
}
