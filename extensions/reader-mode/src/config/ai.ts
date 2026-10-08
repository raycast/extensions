import { AI, getPreferenceValues } from "@raycast/api";
import { SummaryStyle } from "../types/summary";
import { aiLog } from "../utils/logger";

type Creativity = "none" | "low" | "medium" | "high" | "maximum";

export type SummaryModelKey = keyof typeof AI.Model;

/** The model every summary style uses unless the user picks another. */
export const DEFAULT_SUMMARY_MODEL: SummaryModelKey = "OpenAI_GPT-5.4_nano";

/**
 * Models offered by "Regenerate with Model…". The Summary Model preference in package.json
 * offers the same list (a test keeps them in step), plus "default".
 */
export const SUMMARY_MODELS: { key: SummaryModelKey; title: string }[] = [
  { key: "OpenAI_GPT-5.4_nano", title: "GPT-5.4 nano" },
  { key: "OpenAI_GPT-5.4_mini", title: "GPT-5.4 mini" },
  { key: "OpenAI_GPT-6_Luna", title: "GPT-6 Luna" },
  { key: "Anthropic_Claude_Haiku_4.5", title: "Claude Haiku 4.5" },
  { key: "Anthropic_Claude_Sonnet_5.5", title: "Claude Sonnet 5.5" },
  { key: "Google_Gemini_3.8_Flash", title: "Gemini 3.8 Flash" },
  { key: "Google_Gemini_3.1_Pro", title: "Gemini 3.1 Pro" },
  { key: "xAI_Grok-4.7", title: "Grok 4.7" },
];

interface AIStyleConfig {
  model: AI.Model;
  creativity: Creativity;
}

/**
 * AI configuration per summary style.
 * Adjust models and creativity levels as needed based on performance.
 */
export const AI_SUMMARY_CONFIG: Record<SummaryStyle, AIStyleConfig> = {
  overview: {
    model: AI.Model["OpenAI_GPT-5.4_nano"],
    creativity: "low",
  },
  comprehensive: {
    model: AI.Model["OpenAI_GPT-5.4_nano"],
    creativity: "low",
  },
  "opposite-sides": {
    model: AI.Model["OpenAI_GPT-5.4_nano"],
    creativity: "low",
  },
  "five-ws": {
    model: AI.Model["OpenAI_GPT-5.4_nano"],
    creativity: "low",
  },
  eli5: {
    model: AI.Model["OpenAI_GPT-5.4_nano"],
    creativity: "medium",
  },
  entities: {
    model: AI.Model["OpenAI_GPT-5.4_nano"],
    creativity: "low",
  },
  "at-a-glance": {
    model: AI.Model["OpenAI_GPT-5.4_nano"],
    creativity: "low",
  },
};

/**
 * Default AI config used when no specific style is set
 */
export const AI_DEFAULT_CONFIG: AIStyleConfig = {
  model: AI.Model["OpenAI_GPT-5.4_nano"],
  creativity: "low",
};

/**
 * Get AI config for a specific summary style. The model comes from, in order: a model picked
 * with "Regenerate with Model…", the Summary Model preference, then the style's own model.
 */
export function getAIConfigForStyle(style: SummaryStyle | null, modelOverride?: SummaryModelKey): AIStyleConfig {
  const config = (style && AI_SUMMARY_CONFIG[style]) || AI_DEFAULT_CONFIG;
  const choice = modelOverride ?? getSummaryModelChoice();
  return choice ? { ...config, model: AI.Model[choice] } : config;
}

/**
 * The `AI.Model` key picked in the Summary Model preference, or undefined to use
 * each style's own model. A key Raycast has since removed falls back to the default.
 */
export function getSummaryModelChoice(): SummaryModelKey | undefined {
  const { summaryModel } = getPreferenceValues<ExtensionPreferences>();
  if (!summaryModel || summaryModel === "default") return undefined;
  if (!(summaryModel in AI.Model)) {
    aiLog.warn("model:unknown", { summaryModel });
    return undefined;
  }
  return summaryModel as SummaryModelKey;
}

/** Display name for a model key, falling back to the key itself. */
export function getSummaryModelTitle(key: SummaryModelKey): string {
  return SUMMARY_MODELS.find((m) => m.key === key)?.title ?? key;
}
