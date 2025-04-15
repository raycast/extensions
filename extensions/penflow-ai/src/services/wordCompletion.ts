import { getWordCompletions, translateMixedText, processWithModel } from "./ai";
import { AIRequestOptions, Suggestion } from "../utils/types";
import { AI } from "@raycast/api";
import { getPolishPrompt } from "../utils/prompts";

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
  console.log("processInput - received input:", input);

  if (!input.trim() || input.length > 1000) {
    console.log("processInput - empty input or too long, returning empty array");
    return [];
  }

  const aiOptions = {
    ...options,
    creativity: containsChinese(input) ? "none" : ("medium" as AI.Creativity),
  };

  try {
    // If contains Chinese, return translation and refinement results
    if (containsChinese(input)) {
      console.log("processInput - Chinese text detected, getting translations");
      const translatedTexts = await translateMixedText(input, aiOptions);
      console.log("processInput - received translations:", translatedTexts);
      const results = translatedTexts.map((text) => ({
        text: text.toString(),
        type: "translation" as const,
      }));
      console.log("processInput - returning translation results:", JSON.stringify(results, null, 2));
      return results;
    }

    const totalWords = countWords(input);
    const lastSegment = getLastEnglishSegment(input);
    const suggestions: Suggestion[] = [];

    // If the last word is incomplete and total words <= 2, only return completion suggestions
    if (needsCompletion(input) && totalWords <= 2) {
      console.log("processInput - getting word completions for:", lastSegment);
      const completions = await getWordCompletions(lastSegment, aiOptions);
      console.log("processInput - received completions:", completions);
      const results = completions.slice(0, 5).map((text) => ({
        text: text.toString(),
        type: "completion" as const,
      }));
      console.log("processInput - returning completion results:", JSON.stringify(results, null, 2));
      return results;
    }

    // Other cases, return both completion and refinement suggestions
    if (needsCompletion(input)) {
      console.log("processInput - getting word completions for:", lastSegment);
      const completions = await getWordCompletions(lastSegment, aiOptions);
      console.log("processInput - received completions:", completions);
      suggestions.push(
        ...completions.slice(0, 3).map((text) => ({
          text: text.toString(),
          type: "completion" as const,
        })),
      );
    }

    // If not a simple completion scenario, add refinement suggestions
    if (totalWords > 1) {
      console.log("processInput - getting polish suggestions for:", input);
      const polishResults = await polishText(input, aiOptions);
      console.log("processInput - received polish results:", polishResults);
      suggestions.push(
        ...polishResults.map((text) => ({
          text: text.toString(),
          type: "polish" as const,
        })),
      );
    }

    console.log("processInput - returning final suggestions:", JSON.stringify(suggestions, null, 2));
    return suggestions;
  } catch (error) {
    console.error("Error processing input:", error);
    throw error;
  }
}

// New refinement function
async function polishText(text: string, options?: AIRequestOptions): Promise<string[]> {
  console.log("polishText - received text:", text);

  try {
    const messages = getPolishPrompt(text);
    console.log("polishText - using prompt:", messages);
    const response = await processWithModel(messages, options);
    console.log("polishText - received response:", response);

    // Parse all variants
    const results = response
      .split("\n")
      .filter((line: string) => line.includes(": "))
      .map((line: string) => line.split(": ")[1].trim());

    const finalResults = results.length >= 3 ? results : [response];
    console.log("polishText - returning results:", finalResults);
    return finalResults;
  } catch (error) {
    console.error("Error polishing text:", error);
    throw error;
  }
}
