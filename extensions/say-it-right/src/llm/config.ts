import type { ChatConfig } from "./client";
import {
  ANALYSIS_MODELS,
  DEFAULT_ANALYSIS_MODELS,
  DEFAULT_ANALYSIS_PROVIDER,
  PROVIDER_IDS,
  knownModelOrDefault,
  type ProviderName,
} from "./models";

export {
  PROVIDER_LABELS,
  type ProviderName,
  type TtsProviderName,
} from "./models";

export interface RawPrefs {
  openaiApiKey?: string;
  openaiAnalysisModel?: string;
  qwenApiKey?: string;
  qwenAnalysisModel?: string;
  qwenRegion?: "beijing" | "intl";
  // qwenApiKey is the DashScope key for Qwen-TTS only.
  // Qwen analysis uses Token Plan through qwenAnalysisApiKey/baseURL.
  qwenAnalysisBaseURL?: string;
  qwenAnalysisApiKey?: string;
  geminiApiKey?: string;
  geminiAnalysisModel?: string;
  minimaxApiKey?: string;
  minimaxAnalysisModel?: string;
  minimaxBaseURL?: string;
  mimoApiKey?: string;
  mimoAnalysisModel?: string;
  mimoBaseURL?: string;
}

export const QWEN_BASE = {
  compatible:
    "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
  anthropic: "https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic",
} as const;

/** Gemini's OpenAI-compatible endpoint. No trailing slash — the client
 * appends `/chat/completions`. */
export const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/openai";

/** MiMo (Xiaomi) Token Plan Anthropic-compatible base. */
export const MIMO_BASE = "https://token-plan-cn.xiaomimimo.com/anthropic";

/** MiniMax Token Plan's Anthropic-compatible endpoint. */
export const MINIMAX_BASE = "https://api.minimaxi.com/anthropic";

export class MissingKeyError extends Error {
  constructor(public provider: ProviderName) {
    super(`Missing API key for ${provider}`);
  }
}

export function getAvailableAnalysisProviders(prefs: {
  openaiApiKey?: string;
  qwenApiKey?: string;
  qwenAnalysisApiKey?: string;
  geminiApiKey?: string;
  mimoApiKey?: string;
  minimaxApiKey?: string;
}): ProviderName[] {
  return PROVIDER_IDS.filter((provider) => {
    if (provider === "qwen") {
      return Boolean(prefs.qwenAnalysisApiKey?.trim());
    }
    if (provider === "minimax") return Boolean(prefs.minimaxApiKey?.trim());
    if (provider === "mimo") return Boolean(prefs.mimoApiKey?.trim());
    if (provider === "gemini") return Boolean(prefs.geminiApiKey?.trim());
    return Boolean(prefs.openaiApiKey?.trim());
  });
}

export function pickInitialProvider(prefs: {
  openaiApiKey?: string;
  qwenApiKey?: string;
  qwenAnalysisApiKey?: string;
  geminiApiKey?: string;
  mimoApiKey?: string;
  minimaxApiKey?: string;
  defaultAnalysisProvider?: ProviderName;
}): ProviderName {
  const available = getAvailableAnalysisProviders(prefs);
  if (available.length === 1) return available[0];
  // Several (or none) configured → honor the preferred provider, else default.
  const preferred = prefs.defaultAnalysisProvider;
  if (preferred && available.includes(preferred)) return preferred;
  return available[0] ?? preferred ?? DEFAULT_ANALYSIS_PROVIDER;
}

export function resolveAnalysisModel(
  provider: ProviderName,
  prefs: RawPrefs,
): string {
  if (provider === "openai") {
    return knownModelOrDefault(
      prefs.openaiAnalysisModel,
      ANALYSIS_MODELS.openai,
      DEFAULT_ANALYSIS_MODELS.openai,
    );
  }
  if (provider === "gemini") {
    return knownModelOrDefault(
      prefs.geminiAnalysisModel,
      ANALYSIS_MODELS.gemini,
      DEFAULT_ANALYSIS_MODELS.gemini,
    );
  }
  if (provider === "minimax") {
    return knownModelOrDefault(
      prefs.minimaxAnalysisModel,
      ANALYSIS_MODELS.minimax,
      DEFAULT_ANALYSIS_MODELS.minimax,
    );
  }
  if (provider === "mimo") {
    return knownModelOrDefault(
      prefs.mimoAnalysisModel,
      ANALYSIS_MODELS.mimo,
      DEFAULT_ANALYSIS_MODELS.mimo,
    );
  }
  return knownModelOrDefault(
    prefs.qwenAnalysisModel,
    ANALYSIS_MODELS.qwen,
    DEFAULT_ANALYSIS_MODELS.qwen,
  );
}

export function resolveAnalysisConfig(
  provider: ProviderName,
  prefs: RawPrefs,
): ChatConfig {
  if (provider === "openai") {
    const key = prefs.openaiApiKey?.trim();
    if (!key) throw new MissingKeyError("openai");
    return {
      baseURL: "https://api.openai.com/v1",
      apiKey: key,
      model: resolveAnalysisModel("openai", prefs),
    };
  }
  if (provider === "gemini") {
    const key = prefs.geminiApiKey?.trim();
    if (!key) throw new MissingKeyError("gemini");
    return {
      baseURL: GEMINI_BASE,
      apiKey: key,
      model: resolveAnalysisModel("gemini", prefs),
    };
  }
  if (provider === "minimax") {
    const key = prefs.minimaxApiKey?.trim();
    if (!key) throw new MissingKeyError("minimax");
    return {
      baseURL: prefs.minimaxBaseURL?.trim() || MINIMAX_BASE,
      apiKey: key,
      model: resolveAnalysisModel("minimax", prefs),
      apiProtocol: "anthropic",
      extraBody: { thinking: { type: "disabled" } },
    };
  }
  if (provider === "mimo") {
    const key = prefs.mimoApiKey?.trim();
    if (!key) throw new MissingKeyError("mimo");
    const mimoBaseURL = resolveMimoBaseURL(prefs.mimoBaseURL);
    const mimoAnthropic = isAnthropicCompatibleBaseURL(mimoBaseURL);
    return {
      baseURL: mimoBaseURL,
      apiKey: key,
      model: resolveAnalysisModel("mimo", prefs),
      apiProtocol: mimoAnthropic ? "anthropic" : "openai",
      authHeader: mimoAnthropic ? undefined : "api-key",
      // MiMo-V2.5 uses a Qwen3-style reasoning parser; disable thinking for
      // fast, deterministic structured output (mirrors Qwen here).
      extraBody: mimoAnthropic
        ? { thinking: { type: "disabled" } }
        : { enable_thinking: false },
    };
  }
  // Qwen analysis always uses Token Plan. DashScope is reserved for Qwen-TTS.
  const analysisKey = prefs.qwenAnalysisApiKey?.trim();
  if (!analysisKey) throw new MissingKeyError("qwen");
  const qwenBaseURL = prefs.qwenAnalysisBaseURL?.trim() || QWEN_BASE.anthropic;
  const qwenAnthropic = isAnthropicCompatibleBaseURL(qwenBaseURL);
  return {
    baseURL: qwenBaseURL,
    apiKey: analysisKey,
    model: resolveAnalysisModel("qwen", prefs),
    apiProtocol: qwenAnthropic ? "anthropic" : "openai",
    extraBody: qwenAnthropic
      ? { thinking: { type: "disabled" } }
      : { enable_thinking: false },
  };
}

function isAnthropicCompatibleBaseURL(baseURL: string): boolean {
  const lower = baseURL.toLowerCase();
  return lower.includes("/anthropic") || lower.endsWith("/v1/messages");
}

export function resolveMimoBaseURL(baseURL?: string): string {
  const configured = baseURL?.trim();
  if (configured && isAnthropicCompatibleBaseURL(configured)) return configured;
  return MIMO_BASE;
}
