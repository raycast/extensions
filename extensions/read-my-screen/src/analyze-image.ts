import { EXTENSION_DISPLAY_NAME } from "./extension-brand";
import { analyzeImageWithAnthropic } from "./anthropic-vision";
import { analyzeImageWithGemini } from "./gemini-vision";
import type { ParsedModel } from "./model";
import type { ModelResponse } from "./token-usage";
import { analyzeImageWithOpenAI, formatOpenAIError } from "./openai-vision";

function anthropicImageMediaType(m: string): "image/png" | "image/jpeg" | "image/gif" | "image/webp" {
  switch (m) {
    case "image/jpeg":
    case "image/gif":
    case "image/webp":
    case "image/png":
      return m;
    default:
      return "image/png";
  }
}

export async function analyzeImage(
  prefs: Preferences,
  parsed: ParsedModel,
  base64Image: string,
  userPrompt: string,
  imageMediaType = "image/png",
): Promise<ModelResponse> {
  const { provider, modelId } = parsed;

  if (provider === "openai") {
    const key = prefs.openaiApiKey?.trim();
    if (!key) {
      throw new Error(`Add your OpenAI API key in ${EXTENSION_DISPLAY_NAME} preferences.`);
    }
    return analyzeImageWithOpenAI(key, modelId, base64Image, userPrompt, imageMediaType);
  }

  if (provider === "anthropic") {
    const key = prefs.anthropicApiKey?.trim();
    if (!key) {
      throw new Error(`Add your Anthropic API key in ${EXTENSION_DISPLAY_NAME} preferences.`);
    }
    return analyzeImageWithAnthropic(key, modelId, base64Image, userPrompt, anthropicImageMediaType(imageMediaType));
  }

  const key = prefs.geminiApiKey?.trim();
  if (!key) {
    throw new Error(`Add your Google Gemini API key in ${EXTENSION_DISPLAY_NAME} preferences.`);
  }
  return analyzeImageWithGemini(key, modelId, base64Image, userPrompt, imageMediaType);
}

export function formatVisionError(err: unknown): string {
  if (err && typeof err === "object" && "status" in err) {
    return formatOpenAIError(err);
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
