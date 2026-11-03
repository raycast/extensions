import type { ProviderId } from "../core/types";

export type DirectProviderId = Exclude<ProviderId, "openrouter">;

/**
 * Central exclusion rules of the model catalog. Everything that decides which provider models are hidden lives in
 * this single file so it can be tuned without touching the merge logic.
 */

/**
 * OpenAI and Gemini list non-text models (embeddings, speech, images, video, …) next to chat models and expose no
 * reliable capability field, so they are filtered by name. Matching is case-insensitive on the full model ID.
 * "Live" and "audio" style models need a streaming socket or audio I/O, which this extension never uses.
 */
const NON_TEXT_COMMON = [
  /embedding/,
  /(^|[-/._])tts([-/._]|$)/,
  /whisper/,
  /image/,
  /imagen/,
  /dall-e/,
  /moderation/,
  /realtime/,
  /audio/,
  /transcribe/,
  /(^|[-/._])live([-/._]|$)/,
  /sora/,
  /(^|[-/._])veo([-/._]|$)/,
  /computer-use/,
  /robotics/,
];

export const OPENAI_EXCLUDE_PATTERNS: readonly RegExp[] = [
  ...NON_TEXT_COMMON,
  // Legacy completion-only models: no chat endpoint.
  /davinci|babbage|-instruct/,
  // Responses-API-only families; the shared chat-completions adapter cannot call them.
  /codex|deep-research/,
  // Fine-tunes belong to one account and are not a general catalog entry.
  /^ft:/,
];

export const GEMINI_EXCLUDE_PATTERNS: readonly RegExp[] = [...NON_TEXT_COMMON, /(^|[-/._])aqa([-/._]|$)/, /learnlm/];

/**
 * OpenRouter vendors that also have a direct provider. Their models stay in the catalog, and `routing.ts` decides per
 * API key which of the two routes is shown.
 *
 * Verified 2026-11-02 against the live https://openrouter.ai/api/v1/models listing (451 models):
 * - The prefixes `anthropic/`, `openai/` and `google/` are the only ones these vendors use.
 * - OpenRouter also publishes moving aliases with a tilde prefix (`~anthropic/claude-opus-latest`). They would show
 *   the same models twice and cannot be mapped to a direct model ID, so they are hidden.
 * - Open-weight models of these vendors have no direct route and always go through OpenRouter:
 *   `openai/gpt-oss-*` (incl. `gpt-oss-safeguard-*`) and `google/gemma-*`.
 * - Meta's Muse models live under `meta/`, not under one of these vendors, so they need no rule.
 * - `*:batch` variants are listed with an empty `endpoints` array (no chat route), so they are always hidden.
 */
export const OPENROUTER_DIRECT_VENDORS: Readonly<Record<string, DirectProviderId>> = {
  anthropic: "anthropic",
  openai: "openai",
  google: "gemini",
};

/** Open models of a direct vendor that no direct provider offers. */
export const OPENROUTER_ALLOW_PATTERNS: readonly RegExp[] = [/^~?openai\/gpt-oss-/, /^~?google\/gemma-/];

const OPENROUTER_EXCLUDE_PATTERNS: readonly RegExp[] = [/:batch$/];

function matchesAny(patterns: readonly RegExp[], value: string): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

/** The direct provider that also serves this OpenRouter model, if there is one. */
export function directProviderOf(openRouterModelId: string): DirectProviderId | undefined {
  const id = openRouterModelId.toLowerCase();
  if (matchesAny(OPENROUTER_ALLOW_PATTERNS, id)) return undefined;
  const vendor = /^~?([^/]+)\//.exec(id)?.[1];
  return vendor === undefined ? undefined : OPENROUTER_DIRECT_VENDORS[vendor];
}

export function isOpenRouterModelIncluded(modelId: string): boolean {
  const id = modelId.toLowerCase();
  if (matchesAny(OPENROUTER_EXCLUDE_PATTERNS, id)) return false;
  const direct = directProviderOf(id);
  if (direct === undefined) return true;
  if (id.startsWith("~")) return false;
  // The vendor's image and audio models need the same filter as on the direct route.
  return isModelIncluded(direct, id.slice(id.indexOf("/") + 1));
}

/** Whether a model of the given provider should appear in the catalog at all. */
export function isModelIncluded(provider: ProviderId, modelId: string): boolean {
  const id = modelId.toLowerCase();
  switch (provider) {
    case "anthropic":
      // The Models API only lists text models.
      return true;
    case "openai":
      return !matchesAny(OPENAI_EXCLUDE_PATTERNS, id);
    case "gemini":
      return !matchesAny(GEMINI_EXCLUDE_PATTERNS, id);
    case "openrouter":
      return isOpenRouterModelIncluded(modelId);
  }
}
