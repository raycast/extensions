import { getWordCompletions, translateMixedText } from "./ai";
import { AIRequestOptions } from "../utils/types";
import { AI } from "@raycast/api";

// 辅助函数
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

// 主要的输入处理函数
export async function processInput(
  input: string,
  options?: AIRequestOptions
): Promise<string[]> {
  if (!input.trim() || input.length > 1000) {
    return [];
  }

  const aiOptions = {
    ...options,
    creativity:
      containsChinese(input) || needsCompletion(input)
        ? "none"
        : ("medium" as AI.Creativity),
  };

  try {
    if (containsChinese(input)) {
      const results = await translateMixedText(input, aiOptions);
      return results;
    }

    if (needsCompletion(input)) {
      const lastSegment = getLastEnglishSegment(input);
      const totalWords = countWords(input);

      const completions = await getWordCompletions(lastSegment, aiOptions);

      if (totalWords <= 2) {
        return completions.slice(0, 5);
      } else {
        return completions.slice(0, 3);
      }
    }

    return [];
  } catch (error) {
    console.error("Error processing input:", error);
    throw error;
  }
}
