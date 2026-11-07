import { directProviderOf } from "../catalog/filters";
import { ProviderError } from "../core/errors";
import type {
  CatalogEntry,
  CreativityLevel,
  ModelRef,
  OpenRouterPrivacy,
  OpenRouterProviderOptions,
  PrivacyOverride,
  ProviderId,
  ProviderProfile,
  ReasoningLevel,
} from "../core/types";

type ReasoningStyle = ProviderProfile["reasoningStyle"];

const LEVELS: readonly ReasoningLevel[] = ["default", "low", "medium", "high"];
const LEVELS_WITH_OFF: readonly ReasoningLevel[] = ["default", "off", "low", "medium", "high"];
const NO_LEVELS: readonly ReasoningLevel[] = ["default"];

/** `requires-no-reasoning`: accepted only while the model does not reason, which the effort setting decides. */
type TemperatureSupport = "yes" | "no" | "requires-no-reasoning";

interface DirectCapability {
  match: RegExp;
  reasoning: readonly ReasoningLevel[];
  temperature: TemperatureSupport;
  /** The model's default effort is `none`, so "default" also means no reasoning. */
  defaultsToNoReasoning?: boolean;
}

/**
 * What direct models accept on Chat Completions. First match wins; the `xhigh`/`max` levels are outside our scale.
 * Unknown models stay selectable and a rejection surfaces as a clear API error. `off` appears only where the docs show
 * it for the model.
 *
 * OpenAI, checked 2026-11-02 at developers.openai.com/api/docs: guides/latest-model ("When reasoning effort is not
 * `none`, remove `temperature`, `top_p`, and `top_logprobs`"; Astra and 6.1 Sol never support `none`), the model pages
 * for gpt-6.1-terra, gpt-5.6-sol, gpt-5.5, gpt-5.4, gpt-5.4-mini (default `none` on 5.4), and
 * guides/latest-model?model=gpt-5.2 (5.1 and 5.2 default to `none`; gpt-5, -mini and -nano reject temperature outright).
 * Assumptions: 5.3 is treated like 5.4, and legacy gpt-4/3.5 are taken to have no `reasoning_effort`.
 */
const OPENAI_CAPABILITIES: readonly DirectCapability[] = [
  { match: /^(gpt-6-astra|gpt-6\.1-sol)/, reasoning: LEVELS, temperature: "no" },
  { match: /^(gpt-6\.1-terra|gpt-6-sol|gpt-6-luna)/, reasoning: LEVELS_WITH_OFF, temperature: "requires-no-reasoning" },
  {
    match: /^gpt-5\.[1-4]/,
    reasoning: LEVELS_WITH_OFF,
    temperature: "requires-no-reasoning",
    defaultsToNoReasoning: true,
  },
  { match: /^gpt-5\.[5-9]/, reasoning: LEVELS_WITH_OFF, temperature: "requires-no-reasoning" },
  { match: /^gpt-5(-|$)/, reasoning: LEVELS, temperature: "no" },
  { match: /^o\d/, reasoning: LEVELS, temperature: "no" },
  { match: /^(gpt-4|gpt-3\.5|chatgpt-)/, reasoning: NO_LEVELS, temperature: "yes" },
  { match: /./, reasoning: LEVELS, temperature: "yes" },
];

/**
 * Gemini, checked 2026-11-02 at aistudio.google.com/docs/openai ("Reasoning cannot be turned off for Gemini 2.5 Pro
 * or 3 models"; `none` is listed for 2.5 only) and /docs/thinking (gemini-3-pro-preview has low and high only). The
 * docs state no temperature limit on any model, so temperature counts as supported until the API says otherwise.
 */
const GEMINI_CAPABILITIES: readonly DirectCapability[] = [
  { match: /^gemini-2\.5-pro/, reasoning: LEVELS, temperature: "yes" },
  { match: /^gemini-2\.5-flash/, reasoning: LEVELS_WITH_OFF, temperature: "yes" },
  { match: /^gemini-3-pro-preview/, reasoning: ["default", "low", "high"], temperature: "yes" },
  { match: /./, reasoning: LEVELS, temperature: "yes" },
];

function directCapability(ref: ModelRef): DirectCapability | undefined {
  const table =
    ref.provider === "openai" ? OPENAI_CAPABILITIES : ref.provider === "gemini" ? GEMINI_CAPABILITIES : undefined;
  return table?.find((row) => row.match.test(ref.modelId));
}

/** Claude stays Claude on OpenRouter, so a model that takes this route keeps the limits of its direct provider. */
function directEquivalent(ref: ModelRef): ModelRef {
  const provider = ref.provider === "openrouter" ? directProviderOf(ref.modelId) : undefined;
  return provider ? { provider, modelId: ref.modelId.slice(ref.modelId.indexOf("/") + 1) } : ref;
}

/** Levels the form may offer. Always contains "default"; `off` is never offered for Anthropic. */
export function supportedReasoning(ref: ModelRef, entry?: CatalogEntry): readonly ReasoningLevel[] {
  if (entry?.supportsReasoning === false) return NO_LEVELS;
  const model = directEquivalent(ref);
  if (model.provider === "anthropic") return LEVELS;
  // OpenRouter models flagged `reasoning.mandatory` reject `none`; the catalog does not carry that flag yet, so the
  // API's rejection is what the user sees (openrouter.ai/docs/guides/best-practices/reasoning-tokens, 2026-11-02).
  if (model.provider === "openrouter") return LEVELS_WITH_OFF;
  return directCapability(model)?.reasoning ?? LEVELS;
}

/**
 * Whether the creativity field applies. `reasoning` matters because some OpenAI models accept temperature only with
 * effort `none`. For those the form has to re-evaluate when the reasoning field changes.
 */
export function supportsCreativity(
  ref: ModelRef,
  entry?: CatalogEntry,
  reasoning: ReasoningLevel = "default",
): boolean {
  if (ref.provider === "anthropic") return false;
  if (entry?.supportsTemperature === false) return false;
  if (ref.provider === "openrouter") return true;

  const capability = directCapability(ref);
  if (capability?.temperature !== "requires-no-reasoning") return capability?.temperature !== "no";
  return reasoning === "off" || (reasoning === "default" && capability.defaultsToNoReasoning === true);
}

/**
 * Creativity to temperature, per provider. Medium stays below each provider's default of 1 because this extension
 * mostly edits text, and maximum stays below the ceiling, where output degrades into noise.
 *
 * Ranges checked 2026-11-02: OpenAI 0–2 (default 1, API reference). Gemini reports its limit per model as
 * `maxTemperature`; 2 on current models. OpenRouter passes the value to varied hosts, some capped lower than 2, so it
 * tops out at 1.5. Anthropic has no such parameter on `2026-10-21`, see `ANTHROPIC_VERSION`.
 */
export const CREATIVITY_TEMPERATURES: Record<
  ProviderId,
  Record<Exclude<CreativityLevel, "default">, number> | undefined
> = {
  anthropic: undefined,
  openai: { none: 0, low: 0.3, medium: 0.7, high: 1.1, maximum: 1.6 },
  gemini: { none: 0, low: 0.3, medium: 0.7, high: 1.1, maximum: 1.6 },
  openrouter: { none: 0, low: 0.3, medium: 0.7, high: 1, maximum: 1.5 },
};

/** The value for `ChatRequest.temperature`, or undefined when nothing must be sent. */
export function resolveTemperature(
  creativity: CreativityLevel,
  ref: ModelRef,
  entry?: CatalogEntry,
  reasoning: ReasoningLevel = "default",
): number | undefined {
  if (creativity === "default" || !supportsCreativity(ref, entry, reasoning)) return undefined;
  return CREATIVITY_TEMPERATURES[ref.provider]?.[creativity];
}

/**
 * Body fields for a reasoning level. `default` sends nothing so each model keeps its own default.
 *
 * - anthropic: `output_config.effort`, without a `thinking` field. `budget_tokens` returns 400 on current models, and
 *   `off` has no representation here, so it fails loudly instead of quietly running with reasoning on.
 * - openai, gemini: `reasoning_effort`, with `none` for off (see the capability tables).
 * - openrouter: `reasoning.effort`, with `none` for off (openrouter.ai/docs/use-cases/reasoning-tokens, 2026-11-02).
 */
export function reasoningParams(style: ReasoningStyle, level: ReasoningLevel): Record<string, unknown> {
  if (level === "default") return {};
  const effort = level === "off" ? "none" : level;
  switch (style) {
    case "anthropic":
      if (level === "off") {
        throw new ProviderError(
          "invalid-parameter",
          "Reasoning cannot be turned off for Claude models. Choose Low or Default instead.",
          "anthropic",
        );
      }
      return { output_config: { effort } };
    case "openai":
    case "gemini":
      return { reasoning_effort: effort };
    case "openrouter":
      return { reasoning: { effort } };
  }
}

/** Anthropic requires `max_tokens`. This is its value for a model of unknown limit, and the cap for all others. */
export const DEFAULT_MAX_OUTPUT_TOKENS = 64_000;

/** The limit to send, or undefined when the catalog does not know the model's maximum. */
export function resolveMaxOutputTokens(entry?: CatalogEntry): number | undefined {
  const limit = entry?.maxOutputTokens;
  return limit !== undefined && limit > 0 ? Math.min(limit, DEFAULT_MAX_OUTPUT_TOKENS) : undefined;
}

/**
 * Builds OpenRouter's `provider` object from the privacy setting. Field semantics checked
 * 2026-11-02 at openrouter.ai/docs/guides/routing/provider-selection. Returns undefined when nothing is restricted.
 */
export function resolveOpenRouterProvider(
  privacy: OpenRouterPrivacy,
  override: PrivacyOverride = "default",
): OpenRouterProviderOptions | undefined {
  const strict = override === "strict" || privacy.mode === "strict";
  const options: OpenRouterProviderOptions = strict ? { zdr: true, data_collection: "deny" } : {};
  if (privacy.ignoreProviders.length > 0) options.ignore = [...privacy.ignoreProviders];
  return Object.keys(options).length > 0 ? options : undefined;
}
