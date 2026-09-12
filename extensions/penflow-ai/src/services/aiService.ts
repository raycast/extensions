import { AI, showToast, Toast } from "@raycast/api";
import { AIRequestOptions, Message, WritingStyle } from "../utils/types";
import { getWordCompletionPrompt, getTranslationPrompt } from "../utils/prompts";
import { debounce } from "../utils/helpers";
import { logger } from "../utils/logger";

const MIN_TRANSLATION_VARIANTS = 4;

// Default model configuration, set only once
const DEFAULT_MODEL = "google-gemini-2.0-flash";

function logAICall(type: string, input: string, messages: Message[], response?: string) {
  // Debug logs only output in development environment
  logger.debug(`${type}${input ? ` - ${input}` : ""}`);
  if (response) {
    logger.debug(`Response: ${response}`);
  }
}

export async function processWithModel(messages: Message[], _options?: AIRequestOptions): Promise<string> {
  try {
    // Only log AI API request
    logAICall("Request", "", messages);

    const response = await AI.ask(messages[messages.length - 1].content, {
      model: DEFAULT_MODEL as AI.Model,
    });

    // Only log AI API response
    logAICall("Response", "", messages, response.trim());
    return response.trim();
  } catch (error) {
    logger.error("AI processing failed:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "AI Processing Failed",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getWordCompletions(input: string, options?: AIRequestOptions): Promise<string[]> {
  try {
    const messages = getWordCompletionPrompt(input, options?.style || WritingStyle.Professional);

    const response = await processWithModel(messages, options);

    // Changed to return 8 suggestions
    const completions = response
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 8); // Changed from 5 to 8

    return completions.length > 0 ? completions : [response];
  } catch (error) {
    logger.error("Word completion failed:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Word Completion Failed",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function translateMixedText(text: string, options?: AIRequestOptions): Promise<string[]> {
  try {
    const messages = getTranslationPrompt(text);

    const response = await processWithModel(messages, options);

    // Parse different variants
    const results = response
      .split("\n")
      .filter((line) => line.includes(": "))
      .map((line) => line.split(": ")[1].trim());

    return results.length >= MIN_TRANSLATION_VARIANTS ? results : [response];
  } catch (error) {
    logger.error("Translation failed:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Translation Failed",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function getCurrentAISettings() {
  return {
    model: DEFAULT_MODEL,
    modelName: "Google Gemini 2.0 Flash",
    style: "Professional",
  };
}

// Optional: Export debounced version if input debouncing is needed
export const debouncedProcessWithModel = debounce(processWithModel, 1000);
