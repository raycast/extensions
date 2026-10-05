import { AI } from "@raycast/api";
import { SummaryStyle } from "../types/summary";

type Creativity = "none" | "low" | "medium" | "high" | "maximum";

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
    model: AI.Model["OpenAI_GPT-5_nano"],
    creativity: "low",
  },
  comprehensive: {
    model: AI.Model["OpenAI_GPT-5_nano"],
    creativity: "low",
  },
  "opposite-sides": {
    model: AI.Model["OpenAI_GPT-5_nano"],
    creativity: "low",
  },
  "five-ws": {
    model: AI.Model["OpenAI_GPT-5_nano"],
    creativity: "low",
  },
  eli5: {
    model: AI.Model["OpenAI_GPT-5_nano"],
    creativity: "medium",
  },
  entities: {
    model: AI.Model["OpenAI_GPT-5_nano"],
    creativity: "low",
  },
  "at-a-glance": {
    model: AI.Model["OpenAI_GPT-5_nano"],
    creativity: "low",
  },
};

/**
 * Default AI config used when no specific style is set
 */
export const AI_DEFAULT_CONFIG: AIStyleConfig = {
  model: AI.Model["OpenAI_GPT-5_nano"],
  creativity: "low",
};

/**
 * Get AI config for a specific summary style
 */
export function getAIConfigForStyle(style: SummaryStyle | null): AIStyleConfig {
  if (!style) return AI_DEFAULT_CONFIG;
  return AI_SUMMARY_CONFIG[style] ?? AI_DEFAULT_CONFIG;
}
