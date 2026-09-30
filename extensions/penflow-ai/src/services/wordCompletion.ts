import { getWordCompletions, translateMixedText, processWithModel } from "./aiService";
import { AIRequestOptions, Suggestion } from "../utils/types";
import { AI, showToast, Toast } from "@raycast/api";
import { getPolishPrompt } from "../utils/prompts";
import { logger } from "../utils/logger";

// Helper functions
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

function getLastEnglishSegment(text: string): string {
  const matches = text.match(/[a-zA-Z]+$/);
  return matches ? matches[0] : "";
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

function needsCompletion(text: string): boolean {
  const lastSegment = getLastEnglishSegment(text);
  return lastSegment.length >= 2;
}

// Main input processing function
export async function processInput(input: string, options?: AIRequestOptions): Promise<Suggestion[]> {
  if (!input.trim() || input.length > 1000) {
    // Input is empty or too long, return empty array directly, do not log details
    return [];
  }

  const aiOptions = {
    ...options,
    creativity: containsChinese(input) ? "none" : ("medium" as AI.Creativity),
  };

  try {
    // If contains Chinese, return translation and refinement results
    if (containsChinese(input)) {
      const translatedTexts = await translateMixedText(input, aiOptions);
      const results = translatedTexts.map((text) => ({
        text: text.toString(),
        type: "translation" as const,
      }));
      return results;
    }

    const totalWords = countWords(input);
    const lastSegment = getLastEnglishSegment(input);
    const suggestions: Suggestion[] = [];

    // If the last word is incomplete and total words <= 2, only return completion suggestions
    if (needsCompletion(input) && totalWords <= 2) {
      const completions = await getWordCompletions(lastSegment, aiOptions);
      const results = completions.map((text) => ({
        text: text.toString(),
        type: "completion" as const,
      }));
      return results;
    }

    // Other cases, return both completion and refinement suggestions
    if (needsCompletion(input)) {
      const completions = await getWordCompletions(lastSegment, aiOptions);
      suggestions.push(
        ...completions.slice(0, 3).map((text) => ({
          text: text.toString(),
          type: "completion" as const,
        })),
      );
    }

    // If not a simple completion scenario, add refinement suggestions
    if (totalWords > 1) {
      const polishResults = await polishText(input, aiOptions);
      suggestions.push(
        ...polishResults.map((text) => ({
          text: text.toString(),
          type: "polish" as const,
        })),
      );
    }

    return suggestions;
  } catch (error) {
    logger.error("Error processing input:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not process input",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// New refinement function
async function polishText(text: string, options?: AIRequestOptions): Promise<string[]> {
  try {
    const messages = getPolishPrompt(text);
    const response = await processWithModel(messages, options);

    // Parse all variants
    const results = response
      .split("\n")
      .filter((line: string) => line.includes(": "))
      .map((line: string) => line.split(": ")[1].trim());

    const finalResults = results.length >= 3 ? results : [response];
    return finalResults;
  } catch (error) {
    logger.error("Error polishing text:", error);
    throw error;
  }
}
