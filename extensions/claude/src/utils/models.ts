import type { AvailableModel } from "../api/models";

/** Claude model families, ordered from most to least capable. */
export type ModelTier = "opus" | "sonnet" | "haiku";

export const MODEL_TIERS: ModelTier[] = ["opus", "sonnet", "haiku"];

/** Identifies the family a model id belongs to, or null for anything unrecognized. */
export function getModelTier(modelId: string): ModelTier | null {
  return MODEL_TIERS.find((tier) => modelId.includes(tier)) ?? null;
}

/**
 * Extracts a comparable generation number from a model id — `claude-opus-4-1-…` → 4.1,
 * `claude-opus-5` → 5, `claude-3-7-sonnet-…` → 3.7.
 *
 * Both id layouts occur in the wild (`claude-<tier>-<version>` for 4+, and
 * `claude-<version>-<tier>` for 3.x), and a trailing 8-digit date snapshot must never
 * be read as a version — treating `claude-3-opus-20240229` as generation 20240229 would
 * rank the oldest model as the newest.
 */
export function getModelGeneration(modelId: string): number {
  // Drop a trailing date snapshot (e.g. -20240229) before looking for version digits.
  const withoutDate = modelId.replace(/-\d{8}$/, "");
  // Version digits are 1-2 chars; an 8-digit run is a date, not a version.
  const match = withoutDate.match(/-(\d{1,2})(?:-(\d{1,2}))?(?=-|$)/);
  if (!match) return 0;
  const major = Number(match[1]);
  const minor = Number(match[2] ?? 0);
  return major + minor / 10;
}

/**
 * The maximum output tokens a model accepts.
 *
 * Prefers the `max_tokens` the models API advertises for the model, which is
 * authoritative. The name-based tiers below are a fallback for older API responses that
 * omit the field, and for the hardcoded `FALLBACK_MODELS` list.
 *
 * This replaces a name-inference heuristic that matched on substrings like `-4-` and
 * `claude-opus-4`. Every model id outside those shapes — including `claude-opus-5` —
 * fell through to the legacy 4096 ceiling, silently capping presets on current models at
 * a fraction of their real output budget. Inferring a capability from an id is the guess
 * this function now exists to stop making.
 */
export function getMaxTokensForModel(modelId: string, availableModels: AvailableModel[] = []): number {
  // The API advertises the real ceiling per model; trust it over any name heuristic.
  const advertised = availableModels.find((model) => model.id === modelId)?.max_tokens;
  if (advertised && advertised > 0) return advertised;

  const tier = getModelTier(modelId);
  const generation = getModelGeneration(modelId);

  // Claude 3.x and anything unrecognized: the conservative legacy ceiling.
  if (generation < 4) return 4096;

  return tier === "opus" ? 32000 : 64000;
}

/**
 * The largest `max_tokens` this extension sends on a NON-streaming request.
 *
 * The SDK applies TWO independent gates to non-streaming calls, and both throw
 * "Streaming is required for operations that may take longer than 10 minutes" —
 * SYNCHRONOUSLY, before any promise exists and before any network call is made:
 *
 * 1. A projected-runtime gate, `60min * max_tokens / 128000 > 10min`, i.e. anything
 *    above 21333. Deterministic, model-independent, and what this constant encodes.
 * 2. A per-model cap, `MODEL_NONSTREAMING_TOKENS[model]` — 8192 for the Opus 4 and
 *    4.1 ids. That map lives at `@anthropic-ai/sdk/internal/constants`, which the
 *    package export map does not expose (`ERR_PACKAGE_PATH_NOT_EXPORTED`), so it
 *    cannot be read at runtime and a local copy would drift as ids are added.
 *
 * Gate 2 is therefore handled by reacting rather than predicting: see
 * `nonstreamingRetryParams`. Clamping everything to 8192 up front would also work, but
 * would cost every current model 60% of its non-streaming ceiling to guard a case no
 * model in the live list can reach.
 *
 * Streaming requests bypass both gates entirely and are never clamped.
 */
export const MAX_NONSTREAMING_TOKENS = 21333;

/**
 * The value to retry a non-streaming request at when the SDK rejects the first attempt
 * on its per-model cap. 8192 is the lowest cap that map contains, so it clears gate 2
 * for every id currently in it.
 */
export const NONSTREAMING_FALLBACK_TOKENS = 8192;

/**
 * Whether a thrown value is the SDK's non-streaming ceiling rejection.
 *
 * Matched on the message because the SDK raises a plain `AnthropicError` with no code or
 * subclass to test. If that wording ever changes this returns false and the error
 * surfaces to the user unchanged — the safe direction, since the alternative is retrying
 * requests that failed for some entirely different reason.
 */
export function isNonstreamingCeilingError(error: unknown): boolean {
  return error instanceof Error && /streaming is required/i.test(error.message);
}

/**
 * Given the params that were rejected and the error, the params to retry with — or null
 * when a retry would be wrong or pointless.
 *
 * The rejection is thrown before the request leaves the process, so this retry costs a
 * function call and no network round trip. Reacting to the cap beats hardcoding a copy
 * of the SDK's model map: a model added to that map later is handled with no change
 * here, and a shorter answer beats an error the user can do nothing about.
 */
export function nonstreamingRetryParams<T extends { max_tokens: number }>(params: T, error: unknown): T | null {
  if (!isNonstreamingCeilingError(error)) return null;
  if (params.max_tokens <= NONSTREAMING_FALLBACK_TOKENS) return null;
  return { ...params, max_tokens: NONSTREAMING_FALLBACK_TOKENS };
}

/**
 * Whether a model accepts a `temperature` other than the default.
 *
 * Sampling parameters were REMOVED on Claude Opus 4.7 and later — sending `temperature`
 * at all returns a 400 on those models. Sending it to an older model is still fine, so
 * this gates the request rather than dropping the value everywhere.
 */
export function supportsTemperature(modelId: string): boolean {
  return getModelGeneration(modelId) < 4.7;
}

/**
 * Builds the model-dependent request fields shared by the streaming and non-streaming
 * paths.
 *
 * Both paths must construct these identically. They were duplicated, and the duplication
 * is what let two separate defects hide: `temperature` was sent unconditionally on both
 * (a hard 400 on Opus 4.7+), and neither clamped `max_tokens` for the non-streaming
 * ceiling. A single builder means the two cannot drift again.
 */
export function buildModelRequestParams(
  model: {
    option: string;
    prompt: string;
    temperature: string;
    max_tokens: string;
  },
  { streaming }: { streaming: boolean }
) {
  const requested = Number(model.max_tokens) || 4096;

  return {
    model: model.option,
    system: model.prompt,
    // Presets store the model's true ceiling (correct for streaming), but the SDK
    // rejects a non-streaming request above MAX_NONSTREAMING_TOKENS outright. Clamp
    // rather than throw: a shorter answer beats no answer.
    max_tokens: streaming ? requested : Math.min(requested, MAX_NONSTREAMING_TOKENS),
    // Sampling parameters were removed on Claude Opus 4.7 and later — sending
    // `temperature` to those models is a 400, so only include it where supported.
    ...(supportsTemperature(model.option) ? { temperature: Number(model.temperature) } : {}),
  };
}
