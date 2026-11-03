import type { ProviderId, ProviderProfile } from "../core/types";

/**
 * Required on every Claude API call. On this version `temperature`, `top_p` and `top_k` return 400 on every model.
 * Source: platform.claude.com/docs/en/api/migration-2026-10-21, checked 2026-11-02.
 */
export const ANTHROPIC_VERSION = "2026-10-21";

/**
 * Connection profiles. Sources checked 2026-11-02:
 * - OpenAI runs on Chat Completions, not Responses. developers.openai.com/api/docs/guides/migrate-to-responses says
 *   "Chat Completions remains supported", and GPT-6 Astra, GPT-6.1 Sol and Terra accept it; only tool calling needs
 *   Responses, which this extension does not use. Exception: Pro models (e.g. gpt-5.5-pro) have no Chat Completions
 *   route, see `isChatCompletionsModel`.
 * - Gemini's OpenAI layer is beta (aistudio.google.com/docs/openai). The trailing slash is Google's documented form.
 * - OpenRouter: openrouter.ai/docs/api-reference/overview.
 */
export const PROFILES: Record<ProviderId, ProviderProfile> = {
  anthropic: {
    id: "anthropic",
    adapter: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    reasoningStyle: "anthropic",
  },
  openai: {
    id: "openai",
    adapter: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    reasoningStyle: "openai",
  },
  gemini: {
    id: "gemini",
    adapter: "openai-compatible",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    reasoningStyle: "gemini",
  },
  openrouter: {
    id: "openrouter",
    adapter: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    reasoningStyle: "openrouter",
  },
};

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
  openrouter: "OpenRouter",
};
