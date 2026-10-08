import { aiLog } from "./logger";
import { buildPromptForStyle, getStyleLabel as getStyleLabelFromConfig } from "../config/prompts";
import { SummaryStyle, TranslationOptions } from "../types/summary";

/**
 * Get a human-readable label for a summary style
 */
export function getStyleLabel(style: SummaryStyle): string {
  return getStyleLabelFromConfig(style);
}

/**
 * Build the prompt for AI summarization
 * Used with useAI hook in React components
 */
export function buildSummaryPrompt(
  title: string,
  content: string,
  style: SummaryStyle = "overview",
  translationOptions?: TranslationOptions,
): string {
  // Truncate content if too long to avoid token limits
  const maxContentLength = 15000;
  const truncatedContent =
    content.length > maxContentLength ? content.substring(0, maxContentLength) + "\n\n[Content truncated...]" : content;

  aiLog.log("ai:start", {
    style,
    contentLength: content.length,
    titleLength: title.length,
    hasTranslationOptions: !!translationOptions,
  });

  return buildPromptForStyle(style, title, truncatedContent, translationOptions);
}

/**
 * Log successful AI summary generation
 */
export function logSummarySuccess(
  style: SummaryStyle,
  summaryLength: number,
  durationMs?: number,
  estimatedTokens?: number,
): void {
  aiLog.log("ai:success", {
    style,
    summaryLength,
    durationMs,
    durationSec: durationMs ? (durationMs / 1000).toFixed(2) : undefined,
    estimatedTokens,
  });
}

/**
 * Log AI summary error
 */
export function logSummaryError(style: SummaryStyle, error: string, durationMs?: number): void {
  aiLog.error("ai:error", {
    style,
    error,
    durationMs,
    durationSec: durationMs ? (durationMs / 1000).toFixed(2) : undefined,
  });
}

/**
 * Whether a regenerate must be forced with `revalidate`. useAI re-runs by itself when its
 * prompt, model, or `execute` flag changes; regenerating a summary that was generated (not
 * loaded from the cache) with the same prompt and model changes none of them.
 */
export function regenerateNeedsRevalidate(request: {
  prompt: string;
  currentPrompt: string;
  fromCache: boolean;
  model: string;
  currentModel: string;
}): boolean {
  return request.prompt === request.currentPrompt && !request.fromCache && request.model === request.currentModel;
}

/**
 * Format summary for display in markdown
 */
export function formatSummaryBlock(summary: string, style: SummaryStyle, modelTitle?: string | null): string {
  const label = modelTitle ? `${getStyleLabel(style)} · ${modelTitle}` : getStyleLabel(style);
  return `**Summary (${label})**\n\n${summary}`;
}
