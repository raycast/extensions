import { EXTENSION_DISPLAY_NAME } from "./extension-brand";
import { analyzeTextWithAnthropic } from "./anthropic-vision";
import type { BrowserTabInfo } from "./browser-tab";
import { analyzeTextWithGemini } from "./gemini-vision";
import type { ParsedModel } from "./model";
import type { ModelResponse } from "./token-usage";
import { analyzeTextWithOpenAI } from "./openai-vision";

export function buildWebPageUserMessage(instructions: string, tab: BrowserTabInfo, pagePlainText: string): string {
  return [
    instructions.trim(),
    "",
    "---",
    `Browser: ${tab.browser}`,
    `URL: ${tab.url}`,
    `Title: ${tab.title}`,
    "",
    "--- Page text ---",
    pagePlainText.trim(),
  ].join("\n");
}

export async function analyzeWebPageText(
  prefs: Preferences,
  parsed: ParsedModel,
  instructions: string,
  tab: BrowserTabInfo,
  pagePlainText: string,
): Promise<ModelResponse> {
  const userMessage = buildWebPageUserMessage(instructions, tab, pagePlainText);
  const { provider, modelId } = parsed;

  if (provider === "openai") {
    const key = prefs.openaiApiKey?.trim();
    if (!key) {
      throw new Error(`Add your OpenAI API key in ${EXTENSION_DISPLAY_NAME} preferences.`);
    }
    return analyzeTextWithOpenAI(key, modelId, userMessage);
  }

  if (provider === "anthropic") {
    const key = prefs.anthropicApiKey?.trim();
    if (!key) {
      throw new Error(`Add your Anthropic API key in ${EXTENSION_DISPLAY_NAME} preferences.`);
    }
    return analyzeTextWithAnthropic(key, modelId, userMessage);
  }

  const key = prefs.geminiApiKey?.trim();
  if (!key) {
    throw new Error(`Add your Google Gemini API key in ${EXTENSION_DISPLAY_NAME} preferences.`);
  }
  return analyzeTextWithGemini(key, modelId, userMessage);
}
